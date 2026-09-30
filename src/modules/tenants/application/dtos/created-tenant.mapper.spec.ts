import { describe, expect, it } from 'vitest';
import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import { toCreatedTenant } from '@/modules/tenants/application/dtos/created-tenant.mapper.js';
import { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';

describe('toCreatedTenant', () => {
  it('junta al Tenant recién creado con su primer prestamista', () => {
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
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
      createdAt,
    };

    expect(toCreatedTenant(tenant, lender)).toEqual({
      tenant: { id: 'tenant-1', name: 'Préstamos Ana', createdAt },
      lender,
    });
  });
});
