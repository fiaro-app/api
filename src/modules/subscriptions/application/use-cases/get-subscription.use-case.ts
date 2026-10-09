import { Inject, Injectable } from '@nestjs/common';
import { CountLendersByTenantUseCase } from '@/modules/lenders/application/use-cases/count-lenders-by-tenant.use-case.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { SubscriptionDetails } from '@/modules/subscriptions/application/dtos/subscription-details.dto.js';
import { SubscriptionNotFoundError } from '@/modules/subscriptions/domain/errors/subscription-not-found.error.js';
import { computeSubscriptionState } from '@/modules/subscriptions/domain/policies/subscription-status.js';
import type { SubscriptionRepository } from '@/modules/subscriptions/domain/repositories/subscription.repository.js';
import { SUBSCRIPTION_REPOSITORY } from '@/modules/subscriptions/domain/tokens/subscription-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El plan del negocio del prestamista de la sesión: su estado (`ACTIVE`, `GRACE_PERIOD` o
 * `READ_ONLY`), cuándo vence, sus límites y cuánto de ellos usa. Cualquier rol puede verlo: la
 * pantalla de facturación y el aviso de solo lectura le sirven a todos.
 *
 * @remarks
 * Solo informa: no bloquea nada (D-115). El uso de cobradores es el del prestamista de la sesión,
 * que mientras un Tenant tenga un solo prestamista (D-03) es el de todo el negocio.
 */
@Injectable()
export class GetSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: SubscriptionRepository,
    private readonly getLender: GetLenderUseCase,
    private readonly countLendersByTenant: CountLendersByTenantUseCase,
    private readonly listMemberships: ListMembershipsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @throws {@link SubscriptionNotFoundError} Si su Tenant no tiene suscripción.
   */
  async execute(lenderId: string): Promise<SubscriptionDetails> {
    const lender = await this.getLender.execute(lenderId);
    const subscription = await this.subscriptions.findByTenant(lender.tenantId);
    if (subscription === null) {
      throw new SubscriptionNotFoundError(lender.tenantId);
    }
    const [activeLenders, collectors] = await Promise.all([
      this.countLendersByTenant.execute(lender.tenantId),
      this.listMemberships.execute({
        lenderId,
        role: 'COLLECTOR',
        status: 'ACTIVE',
        page: 1,
        pageSize: 1,
      }),
    ]);
    const state = computeSubscriptionState(
      subscription.currentPeriodEndsAt,
      this.clock.now(),
    );
    return {
      planCode: subscription.planCode,
      status: state.status,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt,
      graceEndsAt: state.graceEndsAt,
      daysRemaining: state.daysRemaining,
      graceDaysRemaining: state.graceDaysRemaining,
      isReadOnly: state.status === 'READ_ONLY',
      limits: {
        maxActiveLenders: subscription.maxActiveLenders,
        maxCollectors: subscription.maxCollectors,
      },
      usage: { activeLenders, activeCollectors: collectors.total },
      createdAt: subscription.createdAt,
    };
  }
}
