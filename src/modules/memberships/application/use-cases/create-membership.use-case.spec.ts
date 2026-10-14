import { describe, expect, it, vi } from 'vitest';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-09-30T00:00:00Z');

function setup() {
  const saved: Membership[] = [];
  const create = vi.fn((membership: Membership) => {
    saved.push(membership);
    return Promise.resolve();
  });
  const memberships: MembershipRepository = {
    create,
    findById: vi.fn(() => Promise.resolve(null)),
    findActiveByUserId: vi.fn(() => Promise.resolve([])),
    findActiveByLenderAndRoles: vi.fn(() => Promise.resolve([])),
    countActiveByPortfolio: vi.fn(),
    list: vi.fn(),
    update: vi.fn(() => Promise.resolve()),
  };
  const ids: IdGenerator = { next: () => 'membership-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new CreateMembershipUseCase(memberships, ids, clock),
    create,
    saved,
  };
}

describe('CreateMembershipUseCase', () => {
  it('crea la membresía activa con los roles y la cartera que le dieron', async () => {
    const { useCase, saved } = setup();

    const created = await useCase.execute({
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      portfolioId: 'portfolio-1',
    });

    expect(created).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: NOW,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.deactivatedAt).toBeNull();
  });

  it('sin cartera la deja en null', async () => {
    const { useCase } = setup();

    const created = await useCase.execute({
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['LENDER'],
    });

    expect(created.portfolioId).toBeNull();
  });
});
