import { Module } from '@nestjs/common';
import { LendersModule } from '@/modules/lenders/lenders.module.js';
import { LoansModule } from '@/modules/loans/loans.module.js';
import { MembershipsModule } from '@/modules/memberships/memberships.module.js';
import { SubscriptionCheckoutController } from '@/modules/subscriptions/infrastructure/controllers/subscription-checkout.controller.js';
import { WompiWebhookController } from '@/modules/subscriptions/infrastructure/controllers/wompi-webhook.controller.js';
import { SubscriptionController } from '@/modules/subscriptions/infrastructure/controllers/subscription.controller.js';
import {
  subscriptionsExports,
  subscriptionsProviders,
} from '@/modules/subscriptions/infrastructure/subscriptions.providers.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Suscripciones (PRODUCT.md §7, D-115): el plan de cada Tenant. Publica `GET /subscription` y
 * ofrece `StartTrialSubscriptionUseCase`, que `tenants` usa al crear un negocio. Importa
 * `LendersModule`, `LoansModule` y `MembershipsModule` para el uso del plan (prestamistas, cobradores, administradores y préstamos) y
 * porque `LenderScopeGuard` necesita el puerto de membresías.
 */
@Module({
  imports: [PersistenceModule, LendersModule, LoansModule, MembershipsModule],
  controllers: [
    SubscriptionController,
    SubscriptionCheckoutController,
    WompiWebhookController,
  ],
  providers: subscriptionsProviders,
  exports: subscriptionsExports,
})
export class SubscriptionsModule {}
