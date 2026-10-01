import { describe, expect, it, vi } from 'vitest';
import { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');
const NOW = new Date('2026-10-01T00:00:00Z');

function membershipWith(status: 'ACTIVE' | 'INACTIVE'): Membership {
  return Membership.create({
    id: 'membership-1',
    userId: 'user-1',
    lenderId: 'lender-1',
    roles: ['LENDER'],
    status,
    portfolioId: null,
    createdAt: CREATED_AT,
    deactivatedAt: status === 'INACTIVE' ? CREATED_AT : null,
  });
}

function setup(found: Membership | null) {
  const update = vi.fn(() => Promise.resolve());
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById: vi.fn(() => Promise.resolve(found)),
    findActiveByUserId: vi.fn(),
    update,
  };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new DeactivateMembershipUseCase(memberships, clock),
    update,
  };
}

describe('DeactivateMembershipUseCase', () => {
  it('desactiva una membresía activa', async () => {
    const { useCase, update } = setup(membershipWith('ACTIVE'));

    const deactivated = await useCase.execute('membership-1', 'lender-1');

    expect(deactivated.status).toBe('INACTIVE');
    expect(deactivated.deactivatedAt).toEqual(NOW);
    expect(update).toHaveBeenCalledOnce();
  });

  it('es idempotente: una membresía ya inactiva no se vuelve a tocar', async () => {
    const { useCase, update } = setup(membershipWith('INACTIVE'));

    const deactivated = await useCase.execute('membership-1', 'lender-1');

    expect(deactivated.status).toBe('INACTIVE');
    expect(deactivated.deactivatedAt).toEqual(CREATED_AT);
    expect(update).not.toHaveBeenCalled();
  });

  it('si la membresía no existe para ese prestamista, lanza MembershipNotFoundError', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute('membership-1', 'lender-1'),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });
});
