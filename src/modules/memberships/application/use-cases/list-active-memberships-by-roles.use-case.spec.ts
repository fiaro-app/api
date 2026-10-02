import { describe, expect, it, vi } from 'vitest';
import { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const OWNER = Membership.create({
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
});

function setup() {
  const findActiveByLenderAndRoles = vi.fn(() => Promise.resolve([OWNER]));
  const memberships: MembershipRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findActiveByUserId: vi.fn(),
    findActiveByLenderAndRoles,
    update: vi.fn(),
    list: vi.fn(),
  };
  return {
    useCase: new ListActiveMembershipsByRolesUseCase(memberships),
    findActiveByLenderAndRoles,
  };
}

describe('ListActiveMembershipsByRolesUseCase', () => {
  it('devuelve los datos públicos de las membresías encontradas', async () => {
    const { useCase, findActiveByLenderAndRoles } = setup();

    const found = await useCase.execute('lender-1', ['OWNER', 'LENDER']);

    expect(findActiveByLenderAndRoles).toHaveBeenCalledExactlyOnceWith(
      'lender-1',
      ['OWNER', 'LENDER'],
    );
    expect(found).toEqual([
      expect.objectContaining({ id: 'membership-1', userId: 'user-1' }),
    ]);
  });
});
