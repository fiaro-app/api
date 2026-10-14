import { describe, expect, it, vi } from 'vitest';
import type { CollectorSeats } from '@/modules/memberships/application/services/collector-seats.js';
import { ReactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/reactivate-membership.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { CollectorLimitReachedError } from '@/modules/memberships/domain/errors/collector-limit-reached.error.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

const membership = (
  status: 'ACTIVE' | 'INACTIVE',
  roles: Role[] = ['COLLECTOR'],
) =>
  Membership.create({
    id: 'membership-1',
    userId: 'user-1',
    lenderId: 'lender-1',
    roles,
    status,
    portfolioId: 'portfolio-1',
    createdAt: new Date('2026-09-30T00:00:00Z'),
    deactivatedAt:
      status === 'INACTIVE' ? new Date('2026-10-01T00:00:00Z') : null,
  });

function setup(found: Membership | null) {
  const update = vi.fn(() => Promise.resolve());
  const assertAvailable = vi.fn(() => Promise.resolve());
  const useCase = new ReactivateMembershipUseCase(
    {
      findById: vi.fn(() => Promise.resolve(found)),
      update,
    } as unknown as MembershipRepository,
    { assertAvailable } as unknown as CollectorSeats,
    { runExclusive: (_lenderId, work) => work() },
  );
  return { useCase, update, assertAvailable };
}

describe('ReactivateMembershipUseCase', () => {
  it('reactiva a un cobrador con cupo, con los mismos roles y cartera', async () => {
    const { useCase, update, assertAvailable } = setup(membership('INACTIVE'));

    const reactivated = await useCase.execute('membership-1', 'lender-1');

    expect(assertAvailable).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(reactivated).toMatchObject({
      status: 'ACTIVE',
      deactivatedAt: null,
      roles: ['COLLECTOR'],
      portfolioId: 'portfolio-1',
    });
    expect(update).toHaveBeenCalledOnce();
  });

  it('sin cupo no reactiva', async () => {
    const { useCase, update, assertAvailable } = setup(membership('INACTIVE'));
    assertAvailable.mockRejectedValueOnce(new CollectorLimitReachedError(5));

    await expect(
      useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(CollectorLimitReachedError);
    expect(update).not.toHaveBeenCalled();
  });

  it('un rol que no cobra no revisa el cupo', async () => {
    const { useCase, assertAvailable } = setup(
      membership('INACTIVE', ['LENDER']),
    );

    await useCase.execute('membership-1', 'lender-1');

    expect(assertAvailable).not.toHaveBeenCalled();
  });

  it('es idempotente con una membresía activa', async () => {
    const { useCase, update } = setup(membership('ACTIVE'));

    expect((await useCase.execute('membership-1', 'lender-1')).status).toBe(
      'ACTIVE',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('si no existe lanza MembershipNotFoundError', async () => {
    await expect(
      setup(null).useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });
});
