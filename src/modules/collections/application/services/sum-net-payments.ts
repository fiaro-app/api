import { toBusinessDate } from '@fiaro-app/contracts';
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

/**
 * Lo que valía la suma de los pagos de un préstamo al final de una fecha pasada: cuenta los pagos
 * hechos hasta ese día (`occurredAt`, hora de Bogotá) y descuenta solo las reversiones que ya
 * existían ese día (`createdAt` de la reversión). Un pago que se reversó después todavía contaba
 * entonces. Es la base del saldo histórico con el que se comparan períodos (D-111).
 *
 * @param records - Las visitas del préstamo, con sus pagos y las reversiones de esos pagos.
 * @param asOf - Fecha (`AAAA-MM-DD`) al final de la cual se mide.
 */
export function sumNetPaymentsAsOf(
  records: readonly CollectionVisitRecord[],
  asOf: string,
): number {
  return records.reduce((sum, record) => {
    if (
      record.payment === null ||
      toBusinessDate(record.payment.occurredAt) > asOf
    ) {
      return sum;
    }
    const reversedByThen =
      record.reversal !== null &&
      toBusinessDate(record.reversal.createdAt) <= asOf;
    return reversedByThen ? sum : sum + record.payment.amount;
  }, 0);
}
