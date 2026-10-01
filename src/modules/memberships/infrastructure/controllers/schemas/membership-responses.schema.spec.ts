import { describe, expect, it } from 'vitest';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import {
  toInvitedMembershipResponse,
  toMembershipResponse,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';

const DETAILS: MembershipDetails = {
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: new Date('2026-09-30T00:00:00Z'),
  deactivatedAt: null,
};

describe('toMembershipResponse', () => {
  it('convierte las fechas a texto ISO, con deactivatedAt en null', () => {
    expect(toMembershipResponse(DETAILS)).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: '2026-09-30T00:00:00.000Z',
      deactivatedAt: null,
    });
  });

  it('convierte deactivatedAt cuando no es null', () => {
    const deactivatedAt = new Date('2026-10-01T00:00:00Z');

    expect(
      toMembershipResponse({ ...DETAILS, status: 'INACTIVE', deactivatedAt }),
    ).toMatchObject({ deactivatedAt: '2026-10-01T00:00:00.000Z' });
  });
});

describe('toInvitedMembershipResponse', () => {
  it('conserva la contraseña temporal', () => {
    expect(
      toInvitedMembershipResponse({
        membership: DETAILS,
        tempPassword: 'TempAbc23456',
      }),
    ).toEqual({
      membership: expect.objectContaining({ id: 'membership-1' }),
      tempPassword: 'TempAbc23456',
    });
  });

  it('deja tempPassword en null si el celular ya tenía cuenta', () => {
    expect(
      toInvitedMembershipResponse({ membership: DETAILS, tempPassword: null }),
    ).toMatchObject({ tempPassword: null });
  });
});
