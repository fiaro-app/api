import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/** Lo cobrado en efectivo, por Nequi y por transferencia, en pesos colombianos. */
export interface PaymentAmountsByMethod {
  readonly CASH: number;
  readonly NEQUI: number;
  readonly TRANSFER: number;
}

/**
 * Suma los pagos sin reversión de un conjunto de visitas, desglosados por medio de pago (el
 * cuadre usa `CASH` para saber cuánto efectivo entrega el cobrador, PRODUCT.md §5). Mismo
 * criterio que `sumNetPayments` (D-85): un pago reversado no cuenta en ningún medio.
 *
 * @param records - Las visitas, con sus pagos y las reversiones de esos pagos.
 */
export function sumNetPaymentsByMethod(
  records: readonly CollectionVisitRecord[],
): PaymentAmountsByMethod {
  return records.reduce<PaymentAmountsByMethod>(
    (totals, record) => {
      if (record.payment === null || record.reversal !== null) {
        return totals;
      }
      const method = record.payment.method;
      return { ...totals, [method]: totals[method] + record.payment.amount };
    },
    { CASH: 0, NEQUI: 0, TRANSFER: 0 },
  );
}
