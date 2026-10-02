import type {
  CollectionVisitDetails,
  PaymentDetails,
} from '@/modules/collections/application/dtos/collection-visit-details.dto.js';
import { toPaymentReversalDetails } from '@/modules/collections/application/dtos/payment-reversal-details.mapper.js';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/**
 * @param payment - El pago.
 * @param reversal - Su reversión, o `null` si sigue vigente.
 */
function toPaymentDetails(
  payment: Payment,
  reversal: PaymentReversal | null,
): PaymentDetails {
  return {
    id: payment.id,
    loanId: payment.loanId,
    visitId: payment.visitId,
    amount: payment.amount,
    method: payment.method,
    occurredAt: payment.occurredAt,
    createdAt: payment.createdAt,
    reversal: reversal === null ? null : toPaymentReversalDetails(reversal),
  };
}

/** @param record - La visita con su pago, si tiene uno, y la reversión de ese pago, si tiene una. */
export function toCollectionVisitDetails(
  record: CollectionVisitRecord,
): CollectionVisitDetails {
  return {
    id: record.visit.id,
    loanId: record.visit.loanId,
    collectorMembershipId: record.visit.collectorMembershipId,
    outcome: record.visit.outcome,
    expectedAmount: record.visit.expectedAmount,
    promisedDate: record.visit.promisedDate,
    occurredAt: record.visit.occurredAt,
    createdAt: record.visit.createdAt,
    payment:
      record.payment === null
        ? null
        : toPaymentDetails(record.payment, record.reversal),
  };
}
