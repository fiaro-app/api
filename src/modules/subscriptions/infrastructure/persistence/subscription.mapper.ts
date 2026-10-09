import {
  Subscription,
  type SubscriptionPlanCode,
} from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { SubscriptionModel } from '@/shared/infrastructure/persistence/generated/models.js';

/** @param subscription - Suscripción nueva. */
export function toSubscriptionCreateInput(
  subscription: Subscription,
): Prisma.SubscriptionUncheckedCreateInput {
  return {
    id: subscription.id,
    tenantId: subscription.tenantId,
    planCode: subscription.planCode,
    maxActiveLenders: subscription.maxActiveLenders,
    maxCollectors: subscription.maxCollectors,
    currentPeriodEndsAt: subscription.currentPeriodEndsAt,
    createdAt: subscription.createdAt,
  };
}

/** @param row - Fila de `subscriptions`. */
export function toSubscription(row: SubscriptionModel): Subscription {
  return Subscription.create({
    id: row.id,
    tenantId: row.tenantId,
    // La columna es texto libre para poder añadir planes sin migrar; hoy solo existe `TRIAL`.
    planCode: row.planCode as SubscriptionPlanCode,
    maxActiveLenders: row.maxActiveLenders,
    maxCollectors: row.maxCollectors,
    currentPeriodEndsAt: row.currentPeriodEndsAt,
    createdAt: row.createdAt,
  });
}
