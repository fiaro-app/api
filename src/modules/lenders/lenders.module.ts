import { Module } from '@nestjs/common';
import { LenderController } from '@/modules/lenders/infrastructure/controllers/lender.controller.js';
import { PortfolioController } from '@/modules/lenders/infrastructure/controllers/portfolio.controller.js';
import {
  lendersExports,
  lendersProviders,
} from '@/modules/lenders/infrastructure/lenders.providers.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Prestamistas y sus carteras. Ofrece `CreateLenderUseCase` (lo usa `tenants` para el primer
 * prestamista de cada Tenant, ARCHITECTURE.md §3: los módulos no importan el dominio de otro, se
 * componen por su capa de aplicación) y `LENDER_REPOSITORY`, para los módulos futuros que aíslan
 * por `lenderId`. Publica `GET`/`PATCH /lender` (D-75) y `POST`/`GET /portfolios` (D-80), todas
 * protegidas por `LenderScopeGuard` — de ahí que importe `MembershipsModule`, dueño del puerto
 * que ese guard necesita.
 */
@Module({
  imports: [PersistenceModule, MembershipsModule],
  controllers: [LenderController, PortfolioController],
  providers: lendersProviders,
  exports: lendersExports,
})
export class LendersModule {}
