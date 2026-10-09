import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { TrialSubscriptionSettings } from '@/modules/subscriptions/application/ports/trial-subscription-settings.port.js';

/**
 * Lee los días y los límites de la prueba de las variables de entorno `SUBSCRIPTION_TRIAL_*`:
 * los planes y precios todavía no están definidos (PRODUCT.md §12), así que se ajustan sin
 * redesplegar código.
 */
@Injectable()
export class EnvTrialSubscriptionSettings implements TrialSubscriptionSettings {
  constructor(@Inject(ENV) private readonly env: Env) {}

  trialDays(): number {
    return this.env.subscription.trialDays;
  }

  maxActiveLenders(): number {
    return this.env.subscription.trialMaxActiveLenders;
  }

  maxCollectors(): number {
    return this.env.subscription.trialMaxCollectors;
  }
}
