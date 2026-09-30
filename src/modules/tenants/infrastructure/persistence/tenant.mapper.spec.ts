import { describe, expect, it } from 'vitest';
import { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';
import {
  toTenant,
  toTenantCreateInput,
} from '@/modules/tenants/infrastructure/persistence/tenant.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const tenant = Tenant.create({
  id: 'tenant-1',
  name: 'Préstamos Ana',
  createdAt: CREATED_AT,
});

describe('toTenantCreateInput', () => {
  it('convierte al Tenant en la fila de tenants', () => {
    expect(toTenantCreateInput(tenant)).toEqual({
      id: 'tenant-1',
      name: 'Préstamos Ana',
      createdAt: CREATED_AT,
    });
  });
});

describe('toTenant', () => {
  it('convierte la fila de tenants en la entidad de dominio', () => {
    const row = {
      id: 'tenant-1',
      name: 'Préstamos Ana',
      createdAt: CREATED_AT,
    };

    const found = toTenant(row as unknown as Parameters<typeof toTenant>[0]);

    expect(found.id).toBe('tenant-1');
    expect(found.name).toBe('Préstamos Ana');
    expect(found.createdAt).toBe(CREATED_AT);
  });
});
