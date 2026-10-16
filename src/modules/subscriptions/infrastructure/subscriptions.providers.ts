import type { Provider } from '@nestjs/common';
import { TRIAL_SUBSCRIPTION_SETTINGS } from '@/modules/subscriptions/application/ports/trial-subscription-settings.token.js';
import { PAYMENT_GATEWAY } from '@/modules/subscriptions/application/ports/payment-gateway.token.js';
import { CreateCheckoutUseCase } from '@/modules/subscriptions/application/use-cases/create-checkout.use-case.js';
import { GetCheckoutStatusUseCase } from '@/modules/subscriptions/application/use-cases/get-checkout-status.use-case.js';
import { ProcessPaymentEventUseCase } from '@/modules/subscriptions/application/use-cases/process-payment-event.use-case.js';
import { SUBSCRIPTION_PAYMENT_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-payment-repository.token.js';
import { PrismaSubscriptionPaymentRepository } from '@/modules/subscriptions/infrastructure/persistence/prisma-subscription-payment.repository.js';
import { WompiPaymentGateway } from '@/modules/subscriptions/infrastructure/wompi/wompi-payment-gateway.js';
import { GetSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/get-subscription.use-case.js';
import { StartTrialSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/start-trial-subscription.use-case.js';
import { SUBSCRIPTION_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-repository.token.js';
import { PrismaSubscriptionRepository } from '@/modules/subscriptions/infrastructure/persistence/prisma-subscription.repository.js';
import { EnvTrialSubscriptionSettings } from '@/modules/subscriptions/infrastructure/settings/env-trial-subscription-settings.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `subscriptions.module.ts`. */
export const subscriptionsProviders: Provider[] = [
  { provide: SUBSCRIPTION_REPOSITORY, useClass: PrismaSubscriptionRepository },
  {
    provide: TRIAL_SUBSCRIPTION_SETTINGS,
    useClass: EnvTrialSubscriptionSettings,
  },
  {
    provide: SUBSCRIPTION_PAYMENT_REPOSITORY,
    useClass: PrismaSubscriptionPaymentRepository,
  },
  { provide: PAYMENT_GATEWAY, useClass: WompiPaymentGateway },
  StartTrialSubscriptionUseCase,
  GetSubscriptionUseCase,
  CreateCheckoutUseCase,
  GetCheckoutStatusUseCase,
  ProcessPaymentEventUseCase,
];

/** Lo que el módulo ofrece a los demás: el alta de la prueba, que usa `tenants`. */
export const subscriptionsExports = [StartTrialSubscriptionUseCase];
