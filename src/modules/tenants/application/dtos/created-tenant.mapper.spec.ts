import { describe, expect, it } from 'vitest';
import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import type { CreatedMembership } from '@/modules/memberships/application/dtos/create-membership.dto.js';
import { toCreatedTenant } from '@/modules/tenants/application/dtos/created-tenant.mapper.js';
import { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';

describe('toCreatedTenant', () => {
  it('junta al Tenant recién creado con su primer prestamista y la membresía de dueño', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const tenant = Tenant.create({
      id: 'tenant-1',
      name: 'Préstamos Ana',
      createdAt,
    });
    const lender: CreatedLender = {
      id: 'lender-1',
      tenantId: 'tenant-1',
      name: 'Préstamos Ana',
      logoUrl: null,
      brandColor: null,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      defaultPortfolioId: 'portfolio-1',
      createdAt,
    };
    const ownerMembership: CreatedMembership = {
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt,
    };

    expect(toCreatedTenant(tenant, lender, ownerMembership)).toEqual({
      tenant: { id: 'tenant-1', name: 'Préstamos Ana', createdAt },
      lender,
      ownerMembership,
    });
  });
});
