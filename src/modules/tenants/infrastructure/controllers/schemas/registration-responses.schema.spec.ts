import { describe, expect, it } from 'vitest';
import type { RegisteredOwner } from '@/modules/tenants/application/dtos/register-owner.dto.js';
import { toRegisterOwnerResponse } from '@/modules/tenants/infrastructure/controllers/schemas/registration-responses.schema.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const REGISTERED: RegisteredOwner = {
  user: {
    id: 'user-1',
    phone: '+573001234567',
    fullName: 'Ana Pérez',
    contactEmail: 'ana@example.com',
    contactEmailVerified: false,
    nationalId: '1020304050',
    mustChangePassword: false,
    createdAt: CREATED_AT,
  },
  tenant: {
    tenant: { id: 'tenant-1', name: 'Préstamos Ana', createdAt: CREATED_AT },
    lender: {
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      defaultPortfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
    },
    ownerMembership: {
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
    },
  },
};

describe('toRegisterOwnerResponse', () => {
  it('arma la respuesta con la persona, el Tenant, el Lender y la membresía', () => {
    expect(toRegisterOwnerResponse(REGISTERED)).toEqual({
      user: {
        id: 'user-1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        contactEmail: 'ana@example.com',
        nationalId: '1020304050',
        createdAt: '2026-09-30T00:00:00.000Z',
      },
      tenant: {
        id: 'tenant-1',
        name: 'Préstamos Ana',
        createdAt: '2026-09-30T00:00:00.000Z',
      },
      lender: {
        id: 'lender-1',
        name: 'Préstamos Ana',
        createdAt: '2026-09-30T00:00:00.000Z',
      },
      membership: {
        id: 'membership-1',
        roles: ['OWNER', 'LENDER', 'COLLECTOR'],
        createdAt: '2026-09-30T00:00:00.000Z',
      },
    });
  });
});
