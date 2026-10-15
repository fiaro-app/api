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
  /**
   * El nombre de cada cliente, en una sola consulta.
   *
   * @param clientIds - Los clientes.
   * @param lenderId - El prestamista dueño.
   * @returns `clientId` → nombre completo.
   */
  listClientNames(
    clientIds: readonly string[],
    lenderId: string,
  ): Promise<ReadonlyMap<string, string>>;

  /**
   * El nombre de la persona de cada membresía, en una sola consulta.
   *
   * @param membershipIds - Las membresías.
   * @param lenderId - El prestamista dueño.
   * @returns `membershipId` → nombre completo.
   */
  listMembershipNames(
    membershipIds: readonly string[],
    lenderId: string,
  ): Promise<ReadonlyMap<string, string>>;

  /**
   * @param collectorMembershipId - El cobrador.
   * @param date - Fecha de calendario (`AAAA-MM-DD`).
   * @returns Los clientes que tienen al menos un préstamo asignado a ese cobrador en esa fecha.
   */
  listClientIdsByCollector(
    collectorMembershipId: string,
    date: string,
  ): Promise<readonly string[]>;

  listCollectorsByLoans(
    loanIds: readonly string[],
    date: string,
  ): Promise<ReadonlyMap<string, string>>;
}
