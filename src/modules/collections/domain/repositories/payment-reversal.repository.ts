import type { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';

/** Puerto de persistencia de las reversiones de pago. */
export interface PaymentReversalRepository {
  /**
   * Lanza `PaymentAlreadyReversedError` si ese pago ya tiene una reversión
   * (`@@unique([paymentId])`).
   *
   * @param reversal - Reversión nueva.
   */
  create(reversal: PaymentReversal): Promise<void>;
}
