import type { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';

/**
 * Una visita con su pago, si lo generó (solo `outcome: 'PAID'` tiene uno), y la reversión de ese
 * pago, si tiene una. `reversal` siempre es `null` cuando `payment` lo es: no hay nada que
 * reversar.
 */
export interface CollectionVisitRecord {
  readonly visit: CollectionVisit;
  readonly payment: Payment | null;
  readonly reversal: PaymentReversal | null;
}
