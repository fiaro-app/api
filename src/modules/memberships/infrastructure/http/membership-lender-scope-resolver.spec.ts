import { describe, expect, it, vi } from 'vitest';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MembershipLenderScopeResolver } from '@/modules/memberships/infrastructure/http/membership-lender-scope-resolver.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function membershipFor(id: string, lenderId: string, createdAt = CREATED_AT) {
  return Membership.create({
    id,
    userId: 'user-1',
    lenderId,
    roles: ['LENDER'],
    status: 'ACTIVE',
    portfolioId: null,
    createdAt,
    deactivatedAt: null,
  });
}

function setup(active: readonly Membership[]) {
  const findActiveByUserId = vi.fn(() => Promise.resolve(active));
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findActiveByUserId,
    findActiveByLenderAndRoles: vi.fn(),
    countActiveByPortfolio: vi.fn(),
    findByLenderAndNationalId: vi.fn(),
    countCollectorSeats: vi.fn(),
    hasHistory: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
  };
  return {
    resolver: new MembershipLenderScopeResolver(memberships),
    findActiveByUserId,
  };
}

describe('MembershipLenderScopeResolver.resolve', () => {
  it('sin membresías activas devuelve null', async () => {
    const { resolver, findActiveByUserId } = setup([]);

    await expect(resolver.resolve('user-1')).resolves.toBeNull();
    expect(findActiveByUserId).toHaveBeenCalledExactlyOnceWith('user-1');
  });

  it('con una membresía activa devuelve su alcance', async () => {
    const { resolver } = setup([membershipFor('membership-1', 'lender-1')]);

    await expect(resolver.resolve('user-1')).resolves.toEqual({
      membershipId: 'membership-1',
      lenderId: 'lender-1',
      roles: ['LENDER'],
    });
  });

  it('con varias, usa la primera que devuelve el repositorio (la más antigua)', async () => {
    const { resolver } = setup([
      membershipFor('membership-1', 'lender-1', new Date('2026-01-01')),
      membershipFor('membership-2', 'lender-2', new Date('2026-06-01')),
    ]);

    const scope = await resolver.resolve('user-1');

    expect(scope?.lenderId).toBe('lender-1');
  });
});
