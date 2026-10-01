import type { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { Payment } from '@/modules/collections/domain/entities/payment.entity.js';

/** Una visita con su pago, si lo generó (solo `outcome: 'PAID'` tiene uno). */
export interface CollectionVisitRecord {
  readonly visit: CollectionVisit;
  readonly payment: Payment | null;
}
