import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { TenantModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';

/** @param tenant - Tenant nuevo. */
export function toTenantCreateInput(tenant: Tenant): Prisma.TenantCreateInput {
  return { id: tenant.id, name: tenant.name, createdAt: tenant.createdAt };
}

/** @param row - Fila de `tenants`. */
export function toTenant(row: TenantModel): Tenant {
  return Tenant.create({
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
  });
}
