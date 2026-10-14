import type { PaymentReversalDetails } from '@/modules/collections/application/dtos/payment-reversal-details.dto.js';
import type { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';

/** @param reversal - La reversión. */
export function toPaymentReversalDetails(
  reversal: PaymentReversal,
): PaymentReversalDetails {
  return {
    id: reversal.id,
    paymentId: reversal.paymentId,
    reason: reversal.reason,
    reversedByMembershipId: reversal.reversedByMembershipId,
    createdAt: reversal.createdAt,
  };
}
