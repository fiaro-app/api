import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type {
  CollectionVisitModel,
  PaymentModel,
  PaymentReversalModel,
} from '@/shared/infrastructure/persistence/generated/models.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/** @param visit - Visita nueva. */
export function toCollectionVisitCreateInput(
  visit: CollectionVisit,
): Prisma.CollectionVisitUncheckedCreateInput {
  return {
    id: visit.id,
    loanId: visit.loanId,
    collectorMembershipId: visit.collectorMembershipId,
    outcome: visit.outcome,
    expectedAmount: visit.expectedAmount,
    promisedDate: visit.promisedDate,
    occurredAt: visit.occurredAt,
    createdAt: visit.createdAt,
  };
}

/** @param row - Fila de `collection_visits`. */
export function toCollectionVisit(row: CollectionVisitModel): CollectionVisit {
  return CollectionVisit.create({
    id: row.id,
    loanId: row.loanId,
    collectorMembershipId: row.collectorMembershipId,
    outcome: row.outcome,
    expectedAmount: row.expectedAmount,
    promisedDate: row.promisedDate,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  });
}

/** @param payment - Pago nuevo. */
export function toPaymentCreateInput(
  payment: Payment,
): Prisma.PaymentUncheckedCreateInput {
  return {
    id: payment.id,
    loanId: payment.loanId,
    visitId: payment.visitId,
    amount: payment.amount,
    method: payment.method,
    occurredAt: payment.occurredAt,
    createdAt: payment.createdAt,
  };
}

/** @param row - Fila de `payments`. */
export function toPayment(row: PaymentModel): Payment {
  return Payment.create({
    id: row.id,
    loanId: row.loanId,
    visitId: row.visitId,
    amount: row.amount,
    method: row.method,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  });
}

/** @param reversal - Reversión nueva. */
export function toPaymentReversalCreateInput(
  reversal: PaymentReversal,
): Prisma.PaymentReversalUncheckedCreateInput {
  return {
    id: reversal.id,
    paymentId: reversal.paymentId,
    reason: reversal.reason,
    reversedByMembershipId: reversal.reversedByMembershipId,
    createdAt: reversal.createdAt,
  };
}

/** @param row - Fila de `payment_reversals`. */
export function toPaymentReversal(row: PaymentReversalModel): PaymentReversal {
  return PaymentReversal.create({
    id: row.id,
    paymentId: row.paymentId,
    reason: row.reason,
    reversedByMembershipId: row.reversedByMembershipId,
    createdAt: row.createdAt,
  });
}

/** A qué nivel de detalle se piden las visitas: su pago, y la reversión de ese pago. */
export const WITH_PAYMENT_AND_REVERSAL = {
  payment: { include: { reversal: true } },
} as const;

/**
 * Fila de `collection_visits` con su `payment` (y la `reversal` de ese pago, si tiene una), tal
 * como la trae {@link WITH_PAYMENT_AND_REVERSAL}.
 */
export type CollectionVisitRowWithPayment = CollectionVisitModel & {
  payment:
    | (Parameters<typeof toPayment>[0] & {
        reversal: Parameters<typeof toPaymentReversal>[0] | null;
      })
    | null;
};

/** @param row - Fila con su pago y la reversión de ese pago, si los trae. */
export function toCollectionVisitRecord(
  row: CollectionVisitRowWithPayment,
): CollectionVisitRecord {
  const reversalRow = row.payment?.reversal ?? null;
  return {
    visit: toCollectionVisit(row),
    payment: row.payment === null ? null : toPayment(row.payment),
    reversal: reversalRow === null ? null : toPaymentReversal(reversalRow),
  };
}
