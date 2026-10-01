import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/**
 * Suma los pagos de un préstamo que no tienen reversión: lo que de verdad cuenta para su saldo
 * (D-85). Un pago reversado queda intacto (append-only, D-16) pero deja de sumar aquí.
 *
 * @param records - Las visitas del préstamo, con sus pagos y las reversiones de esos pagos.
 */
export function sumNetPayments(
  records: readonly CollectionVisitRecord[],
): number {
  return records.reduce((sum, record) => {
    if (record.payment === null || record.reversal !== null) {
      return sum;
    }
    return sum + record.payment.amount;
  }, 0);
}
