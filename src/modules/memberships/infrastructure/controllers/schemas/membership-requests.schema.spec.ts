import { describe, expect, it } from 'vitest';
import {
  ChangeMembershipRolesRequestSchema,
  InviteMembershipRequestSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-requests.schema.js';

describe('InviteMembershipRequestSchema', () => {
  it('acepta el celular, el nombre y los roles', () => {
    expect(
      InviteMembershipRequestSchema.safeParse({
        phone: '+573109998877',
        fullName: 'Luis Gómez',
        roles: ['COLLECTOR'],
        portfolioId: '01999999-9999-7999-9999-999999999999',
      }).success,
    ).toBe(true);
  });

  it('rechaza un celular que no es colombiano', () => {
    expect(
      InviteMembershipRequestSchema.safeParse({
        phone: '+15550001234',
        fullName: 'Luis Gómez',
        roles: ['LENDER'],
      }).success,
    ).toBe(false);
  });

  it('rechaza una lista de roles vacía', () => {
    expect(
      InviteMembershipRequestSchema.safeParse({
        phone: '+573109998877',
        fullName: 'Luis Gómez',
        roles: [],
      }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      InviteMembershipRequestSchema.safeParse({
        phone: '+573109998877',
        fullName: 'Luis Gómez',
        roles: ['LENDER'],
        apellido: 'x',
      }).success,
    ).toBe(false);
  });
});

describe('ChangeMembershipRolesRequestSchema', () => {
  it('acepta solo los roles', () => {
    expect(
      ChangeMembershipRolesRequestSchema.safeParse({ roles: ['LENDER'] })
        .success,
    ).toBe(true);
  });

  it('rechaza un cuerpo sin roles', () => {
    expect(ChangeMembershipRolesRequestSchema.safeParse({}).success).toBe(
      false,
    );
  });
});
