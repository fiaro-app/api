import { describe, expect, it, vi } from 'vitest';
import { DeleteMembershipUseCase } from '@/modules/memberships/application/use-cases/delete-membership.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { CollectorHasHistoryError } from '@/modules/memberships/domain/errors/collector-has-history.error.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

const membership = (roles: Role[]) =>
  Membership.create({
    id: 'membership-1',
    userId: 'user-1',
    lenderId: 'lender-1',
    roles,
    status: 'ACTIVE',
    portfolioId: 'portfolio-1',
    createdAt: new Date('2026-09-30T00:00:00Z'),
    deactivatedAt: null,
  });

function setup(found: Membership | null, history: boolean) {
  const remove = vi.fn(() => Promise.resolve());
  const useCase = new DeleteMembershipUseCase({
    findById: vi.fn(() => Promise.resolve(found)),
    hasHistory: vi.fn(() => Promise.resolve(history)),
    delete: remove,
  } as unknown as MembershipRepository);
  return { useCase, remove };
}

describe('DeleteMembershipUseCase', () => {
  it('borra a un cobrador registrado por error, sin historial', async () => {
    const { useCase, remove } = setup(membership(['COLLECTOR']), false);

    await useCase.execute('membership-1', 'lender-1');

    expect(remove).toHaveBeenCalledExactlyOnceWith('membership-1', 'lender-1');
  });

  it('con historial no borra', async () => {
    const { useCase, remove } = setup(membership(['COLLECTOR']), true);

    await expect(
      useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(CollectorHasHistoryError);
    expect(remove).not.toHaveBeenCalled();
  });

  it('nunca borra la membresía del dueño', async () => {
    const { useCase, remove } = setup(
      membership(['OWNER', 'LENDER', 'COLLECTOR']),
      false,
    );

    await expect(
      useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(InvalidMembershipDataError);
    expect(remove).not.toHaveBeenCalled();
  });

  it('si no existe lanza MembershipNotFoundError', async () => {
    await expect(
      setup(null, false).useCase.execute('x', 'lender-1'),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });
});
