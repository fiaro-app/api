import { Inject, Injectable } from '@nestjs/common';
import {
  planHasFeature,
  type PlanFeature,
} from '@/shared/domain/subscriptions/plan-features.js';
import { computeSubscriptionState } from '@/shared/domain/subscriptions/subscription-status.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { SubscriptionAccess } from '@/shared/application/ports/subscription-access.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link SubscriptionAccess} leyendo la tabla `subscriptions` por el Tenant del prestamista.
 *
 * @remarks
 * Vive en `memberships` junto al resolver del alcance, porque todo módulo que usa
 * `LenderScopeGuard` ya importa `MembershipsModule`. Lee la tabla directamente: `subscriptions`
 * importa este módulo, y el camino inverso cerraría un ciclo (igual que `PrismaPlanSeatLimits`).
 */
@Injectable()
export class PrismaSubscriptionAccess implements SubscriptionAccess {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async isReadOnly(lenderId: string): Promise<boolean> {
    const subscription = await this.subscriptionOf(lenderId);
    return (
      subscription !== null &&
      computeSubscriptionState(
        subscription.currentPeriodEndsAt,
        this.clock.now(),
      ).status === 'READ_ONLY'
    );
  }

  async hasFeature(lenderId: string, feature: PlanFeature): Promise<boolean> {
    const subscription = await this.subscriptionOf(lenderId);
    return (
      subscription === null || planHasFeature(subscription.planCode, feature)
    );
  }

  private async subscriptionOf(
    lenderId: string,
  ): Promise<{ planCode: string; currentPeriodEndsAt: Date } | null> {
    const lender = await this.prisma.lender.findUnique({
      where: { id: lenderId },
      select: {
        tenant: {
          select: {
            subscription: {
              select: { planCode: true, currentPeriodEndsAt: true },
            },
          },
        },
      },
    });
    return lender?.tenant.subscription ?? null;
  }
}
