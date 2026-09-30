import type { Provider } from '@nestjs/common';
import { CreateTenantUseCase } from '@/modules/tenants/application/use-cases/create-tenant.use-case.js';
import { TENANT_REPOSITORY } from '@/modules/tenants/domain/tokens/tenant-repository.token.js';
import { PrismaTenantRepository } from '@/modules/tenants/infrastructure/persistence/prisma-tenant.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `tenants.module.ts`. */
export const tenantsProviders: Provider[] = [
  { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
  CreateTenantUseCase,
];

/** Lo que el módulo ofrece a los demás: el alta de Tenants. */
export const tenantsExports = [CreateTenantUseCase];
