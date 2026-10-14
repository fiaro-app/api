import { describe, expect, it } from 'vitest';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import {
  toMembership,
  toMembershipCreateInput,
} from '@/modules/memberships/infrastructure/persistence/membership.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const membership = Membership.create({
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
});

describe('toMembershipCreateInput', () => {
  it('convierte la membresía en la fila de memberships', () => {
    expect(toMembershipCreateInput(membership)).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
      deactivatedAt: null,
    });
  });
});

describe('toMembership', () => {
  it('convierte la fila de memberships en la entidad de dominio', () => {
    const row = {
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['LENDER'],
      status: 'INACTIVE',
      portfolioId: null,
      createdAt: CREATED_AT,
      deactivatedAt: CREATED_AT,
    };

    const found = toMembership(
      row as unknown as Parameters<typeof toMembership>[0],
    );

    expect(found.id).toBe('membership-1');
    expect(found.userId).toBe('user-1');
    expect(found.lenderId).toBe('lender-1');
    expect(found.roles).toEqual(['LENDER']);
    expect(found.status).toBe('INACTIVE');
    expect(found.portfolioId).toBeNull();
    expect(found.createdAt).toBe(CREATED_AT);
    expect(found.deactivatedAt).toBe(CREATED_AT);
  });
});
