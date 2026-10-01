import { describe, expect, it } from 'vitest';
import {
  toMembershipDetails,
  toMembershipDetailsFromCreated,
} from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

describe('toMembershipDetails', () => {
  it('devuelve los datos públicos de la membresía', () => {
    const membership = Membership.create({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
      deactivatedAt: null,
    });

    expect(toMembershipDetails(membership)).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
      deactivatedAt: null,
    });
  });
});

describe('toMembershipDetailsFromCreated', () => {
  it('agrega deactivatedAt: null a lo que devuelve CreateMembershipUseCase', () => {
    expect(
      toMembershipDetailsFromCreated({
        id: 'membership-1',
        userId: 'user-1',
        lenderId: 'lender-1',
        roles: ['LENDER'],
        status: 'ACTIVE',
        portfolioId: null,
        createdAt: CREATED_AT,
      }),
    ).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['LENDER'],
      status: 'ACTIVE',
      portfolioId: null,
      createdAt: CREATED_AT,
      deactivatedAt: null,
    });
  });
});
