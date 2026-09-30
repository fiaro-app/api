import type { CreatedLender } from '@/modules/lenders/application/dtos/create-lender.dto.js';
import type { CreatedMembership } from '@/modules/memberships/application/dtos/create-membership.dto.js';
import type { CreatedTenant } from '@/modules/tenants/application/dtos/create-tenant.dto.js';
import type { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';

/**
 * @param tenant - El Tenant recién creado.
 * @param lender - Su primer prestamista, recién creado.
 * @param ownerMembership - La membresía de dueño de quien lo registró.
 */
export function toCreatedTenant(
  tenant: Tenant,
  lender: CreatedLender,
  ownerMembership: CreatedMembership,
): CreatedTenant {
  return {
    tenant: { id: tenant.id, name: tenant.name, createdAt: tenant.createdAt },
    lender,
    ownerMembership,
  };
}
