import { Module } from '@nestjs/common';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import {
  tenantsExports,
  tenantsProviders,
} from '@/modules/tenants/infrastructure/tenants.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Tenants. Todavía no publica rutas: no hay registro público (`tenant-lender-membership-scope`),
 * así que `CreateTenantUseCase` lo usa el seed de desarrollo por ahora. Importa `LendersModule`
 * porque crear un Tenant siempre crea su primer prestamista.
 */
@Module({
  imports: [PersistenceModule, LendersModule],
  providers: tenantsProviders,
  exports: tenantsExports,
})
export class TenantsModule {}
