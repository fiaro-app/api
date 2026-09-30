import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';
import {
  lendersExports,
  lendersProviders,
} from '@/modules/lenders/infrastructure/lenders.providers.js';

/**
 * Prestamistas. Todavía no publica rutas: ofrece `CreateLenderUseCase` (lo usa `tenants` para el
 * primer prestamista de cada Tenant, ARCHITECTURE.md §3: los módulos no importan el dominio de
 * otro, se componen por su capa de aplicación) y `LENDER_REPOSITORY`, para los módulos futuros
 * que aíslan por `lenderId`.
 */
@Module({
  imports: [PersistenceModule],
  providers: lendersProviders,
  exports: lendersExports,
})
export class LendersModule {}
