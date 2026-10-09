import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

/**
 * Puerto de lectura por lotes para las listas de préstamos y de clientes con saldo (D-113): trae,
 * en una consulta por cada cosa, lo que el cálculo del saldo necesita de una página entera, en
 * vez de pedirlo préstamo por préstamo.
 *
 * @remarks
 * No sustituye a {@link CollectionVisitRepository} ni a {@link CollectionAssignmentRepository},
 * que siguen siendo los que escriben y los que leen de a un préstamo; este solo agrupa lecturas
 * para evitar una consulta por fila.
 */
export interface LoanPortfolioReadRepository {
  /**
   * @param loanIds - Los préstamos; vacío no consulta nada.
   * @returns Las visitas de todos ellos con sus pagos y reversiones, de la más antigua a la más
   * nueva. Cada registro dice a qué préstamo pertenece (`visit.loanId`).
   */
  listVisitRecordsByLoans(
    loanIds: readonly string[],
  ): Promise<readonly CollectionVisitRecord[]>;

  /**
   * @param loanIds - Los préstamos; vacío no consulta nada.
   * @param date - Fecha de calendario (`AAAA-MM-DD`).
   * @returns El cobrador que tiene cada préstamo asignado en esa fecha: `loanId` →
   * `collectorMembershipId`. Un préstamo sin asignación vigente no aparece.
   */
  listCollectorsByLoans(
    loanIds: readonly string[],
    date: string,
  ): Promise<ReadonlyMap<string, string>>;
}
