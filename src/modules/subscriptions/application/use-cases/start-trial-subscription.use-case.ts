import { Inject, Injectable } from '@nestjs/common';
import type { TrialSubscriptionSettings } from '@/modules/subscriptions/application/ports/trial-subscription-settings.port.js';
import { TRIAL_SUBSCRIPTION_SETTINGS } from '@/modules/subscriptions/application/ports/trial-subscription-settings.token.js';
import { PLAN_CATALOG } from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import type { SubscriptionRepository } from '@/modules/subscriptions/domain/repositories/subscription.repository.js';
import { SUBSCRIPTION_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Da de alta la suscripción de prueba de un negocio nuevo: la usa `tenants` al crear un Tenant
 * (D-115). Los días y los límites iniciales salen de la configuración, no del código, porque los
 * planes y precios todavía no están definidos (PRODUCT.md §12).
 */
@Injectable()
export class StartTrialSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
    @Inject(TRIAL_SUBSCRIPTION_SETTINGS)
    private readonly settings: TrialSubscriptionSettings,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param tenantId - El Tenant recién creado. */
  async execute(tenantId: string): Promise<void> {
    const now = this.clock.now();
    await this.subscriptions.create(
      Subscription.create({
        id: this.ids.next(),
        tenantId,
        planCode: 'TRIAL',
        maxActiveLenders: this.settings.maxActiveLenders(),
        maxCollectors: this.settings.maxCollectors(),
        maxAdmins: PLAN_CATALOG.TRIAL.maxAdmins,
        maxPortfolios: PLAN_CATALOG.TRIAL.maxPortfolios,
        maxActiveLoans: PLAN_CATALOG.TRIAL.maxActiveLoans,
        currentPeriodEndsAt: new Date(
          now.getTime() + this.settings.trialDays() * MS_PER_DAY,
        ),
        createdAt: now,
      }),
    );
  }
}
