import { describe, expect, it, vi } from 'vitest';
import type { CollectorSeats } from '@/modules/memberships/application/services/collector-seats.js';
import { ChangeMembershipRolesUseCase } from '@/modules/memberships/application/use-cases/change-membership-roles.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';

const immediateLock: LenderLock = { runExclusive: (_lenderId, work) => work() };

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function membershipWith(
  roles: readonly ('OWNER' | 'LENDER' | 'COLLECTOR')[],
  portfolioId: string | null,
): Membership {
  return Membership.create({
    id: 'membership-1',
    userId: 'user-1',
    lenderId: 'lender-1',
    roles,
    status: 'ACTIVE',
    portfolioId,
    createdAt: CREATED_AT,
    deactivatedAt: null,
  });
}

function setup(found: Membership | null) {
  const update = vi.fn(() => Promise.resolve());
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById: vi.fn(() => Promise.resolve(found)),
    findActiveByUserId: vi.fn(),
    findActiveByLenderAndRoles: vi.fn(),
    countActiveByPortfolio: vi.fn(),
    findByLenderAndNationalId: vi.fn(),
    countCollectorSeats: vi.fn(),
    hasHistory: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    update,
  };
  const assertAvailable = vi.fn(() => Promise.resolve());
  const seats = { assertAvailable } as unknown as CollectorSeats;
  return {
    useCase: new ChangeMembershipRolesUseCase(
      memberships,
      seats,
      immediateLock,
    ),
    update,
    assertAvailable,
  };
}

describe('ChangeMembershipRolesUseCase', () => {
  it('cambia los roles, sin cartera si ninguno es COLLECTOR', async () => {
    const { useCase, update } = setup(
      membershipWith(['COLLECTOR'], 'portfolio-1'),
    );

    const changed = await useCase.execute('membership-1', 'lender-1', [
      'LENDER',
    ]);

    expect(changed.roles).toEqual(['LENDER']);
    expect(changed.portfolioId).toBeNull();
    expect(update).toHaveBeenCalledOnce();
  });

  it('conserva la cartera que ya tenía si los roles nuevos siguen incluyendo COLLECTOR y no llega otra', async () => {
    const { useCase } = setup(membershipWith(['COLLECTOR'], 'portfolio-1'));

    const changed = await useCase.execute('membership-1', 'lender-1', [
      'COLLECTOR',
      'LENDER',
    ]);

    expect(changed.portfolioId).toBe('portfolio-1');
  });

  it('usa la cartera nueva del pedido si llega una', async () => {
    const { useCase } = setup(membershipWith(['COLLECTOR'], 'portfolio-1'));

    const changed = await useCase.execute(
      'membership-1',
      'lender-1',
      ['COLLECTOR'],
      'portfolio-2',
    );

    expect(changed.portfolioId).toBe('portfolio-2');
  });

  it('rechaza COLLECTOR sin ninguna cartera', async () => {
    const { useCase } = setup(membershipWith(['LENDER'], null));

    await expect(
      useCase.execute('membership-1', 'lender-1', ['COLLECTOR']),
    ).rejects.toBeInstanceOf(InvalidMembershipDataError);
  });

  it('si la membresía no existe para ese prestamista, lanza MembershipNotFoundError', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute('membership-1', 'lender-1', ['LENDER']),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });

  it('revisa el cupo del plan cuando una membresía activa pasa a ser cobrador', async () => {
    const { useCase, assertAvailable } = setup(
      membershipWith(['LENDER'], null),
    );

    await useCase.execute(
      'membership-1',
      'lender-1',
      ['LENDER', 'COLLECTOR'],
      'portfolio-1',
    );

    expect(assertAvailable).toHaveBeenCalledExactlyOnceWith('lender-1');
  });

  it('no revisa el cupo si ya era cobrador', async () => {
    const collector = setup(membershipWith(['COLLECTOR'], 'portfolio-1'));

    await collector.useCase.execute('membership-1', 'lender-1', [
      'COLLECTOR',
      'LENDER',
    ]);

    expect(collector.assertAvailable).not.toHaveBeenCalled();
  });

  it('no deja cambiarle los roles al dueño del negocio', async () => {
    const { useCase, update } = setup(
      membershipWith(['OWNER', 'LENDER', 'COLLECTOR'], 'portfolio-1'),
    );

    await expect(
      useCase.execute('membership-1', 'lender-1', ['LENDER']),
    ).rejects.toBeInstanceOf(InvalidMembershipDataError);
    expect(update).not.toHaveBeenCalled();
  });
});
