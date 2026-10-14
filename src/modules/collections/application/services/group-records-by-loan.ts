import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/**
 * Agrupa las visitas de varios préstamos por préstamo, conservando el orden en que llegan.
 *
 * @param records - Las visitas con sus pagos y reversiones, de uno o varios préstamos.
 * @returns `loanId` → sus visitas. Un préstamo sin visitas no aparece.
 */
export function groupRecordsByLoan(
  records: readonly CollectionVisitRecord[],
): ReadonlyMap<string, readonly CollectionVisitRecord[]> {
  const byLoan = new Map<string, CollectionVisitRecord[]>();
  for (const record of records) {
    const loanId = record.visit.loanId;
    const group = byLoan.get(loanId);
    if (group === undefined) {
      byLoan.set(loanId, [record]);
    } else {
      group.push(record);
    }
  }
  return byLoan;
}
