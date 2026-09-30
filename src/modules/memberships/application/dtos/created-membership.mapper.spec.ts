import { describe, expect, it } from 'vitest';
import { toCreatedMembership } from '@/modules/memberships/application/dtos/created-membership.mapper.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

describe('toCreatedMembership', () => {
  it('devuelve los datos de la membresía recién creada', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const membership = Membership.create({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt,
      deactivatedAt: null,
    });

    expect(toCreatedMembership(membership)).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt,
    });
  });
});
