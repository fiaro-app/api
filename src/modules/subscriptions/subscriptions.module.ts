import { Module } from '@nestjs/common';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { SubscriptionController } from '@/modules/subscriptions/infrastructure/controllers/subscription.controller.js';
import {
  subscriptionsExports,
  subscriptionsProviders,
} from '@/modules/subscriptions/infrastructure/subscriptions.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Suscripciones (PRODUCT.md §7, D-115): el plan de cada Tenant. Publica `GET /subscription` y
 * ofrece `StartTrialSubscriptionUseCase`, que `tenants` usa al crear un negocio. Importa
 * `LendersModule` y `MembershipsModule` para el uso del plan (prestamistas y cobradores) y
 * porque `LenderScopeGuard` necesita el puerto de membresías.
 */
@Module({
  imports: [PersistenceModule, LendersModule, MembershipsModule],
  controllers: [SubscriptionController],
  providers: subscriptionsProviders,
  exports: subscriptionsExports,
})
export class SubscriptionsModule {}
