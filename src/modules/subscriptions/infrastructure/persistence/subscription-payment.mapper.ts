import {
  SubscriptionPayment,
  type RefundMode,
} from '@/modules/subscriptions/domain/entities/subscription-payment.entity.js';
import type { PurchasablePlanCode } from '@/modules/subscriptions/domain/plans/plan-catalog.js';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { SubscriptionPaymentModel } from '@/shared/infrastructure/persistence/generated/models.js';

/** @param payment - Orden nueva. */
export function toSubscriptionPaymentCreateInput(
  payment: SubscriptionPayment,
): Prisma.SubscriptionPaymentUncheckedCreateInput {
  const { refund, ...props } = payment.props;
  return {
    ...props,
    ...(refund && {
      refundedAt: refund.refundedAt,
      refundedByUserId: refund.refundedByUserId,
      refundMode: refund.mode,
      refundReference: refund.reference,
      refundReason: refund.reason,
    }),
  };
}

/** @param row - Fila de `subscription_payments`. */
export function toSubscriptionPayment(
  row: SubscriptionPaymentModel,
): SubscriptionPayment {
  return SubscriptionPayment.create({
    id: row.id,
    tenantId: row.tenantId,
    // La columna es texto libre para poder añadir planes sin migrar.
    planCode: row.planCode as PurchasablePlanCode,
    months: row.months,
    amountInCents: row.amountInCents,
    currency: row.currency,
    reference: row.reference,
    status: row.status,
    wompiTransactionId: row.wompiTransactionId,
    paymentMethodType: row.paymentMethodType,
    periodEndsAt: row.periodEndsAt,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
    refund:
      row.refundedAt &&
      row.refundedByUserId &&
      row.refundMode &&
      row.refundReason
        ? {
            refundedAt: row.refundedAt,
            refundedByUserId: row.refundedByUserId,
            mode: row.refundMode as RefundMode,
            reference: row.refundReference,
            reason: row.refundReason,
          }
        : null,
  });
}
