import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type {
  CollectionVisitModel,
  PaymentModel,
} from '@/shared/infrastructure/persistence/generated/models.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';

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
