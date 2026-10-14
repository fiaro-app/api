import type { Provider } from '@nestjs/common';
import { CreateTenantUseCase } from '@/modules/tenants/application/use-cases/create-tenant.use-case.js';
import { RegisterOwnerUseCase } from '@/modules/tenants/application/use-cases/register-owner.use-case.js';
import { TENANT_REPOSITORY } from '@/modules/tenants/domain/tokens/tenant-repository.token.js';
import { PrismaTenantRepository } from '@/modules/tenants/infrastructure/persistence/prisma-tenant.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `tenants.module.ts`. */
export const tenantsProviders: Provider[] = [
  { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
  CreateTenantUseCase,
  RegisterOwnerUseCase,
];

/** Lo que el módulo ofrece a los demás: el alta de Tenants y el registro público. */
export const tenantsExports = [CreateTenantUseCase, RegisterOwnerUseCase];
