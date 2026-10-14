import type { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';

/** Puerto de persistencia de las asignaciones de cobro. */
export interface CollectionAssignmentRepository {
  /** @param assignment - Asignación nueva. */
  create(assignment: CollectionAssignment): Promise<void>;

  /**
   * @param loanId - El préstamo.
   * @returns La asignación vigente sin fecha de fin (`effectiveTo: null`), o `null` si no hay
   * ninguna (préstamo nunca asignado, o su última asignación ya se cerró).
   */
  findOpenByLoan(loanId: string): Promise<CollectionAssignment | null>;

  /**
   * @param loanId - El préstamo.
   * @returns Todas sus asignaciones, de la más antigua a la más nueva.
   */
  listByLoan(loanId: string): Promise<readonly CollectionAssignment[]>;

  /**
   * Las asignaciones vigentes de un cobrador en una fecha: `effectiveFrom <= date` y
   * (`effectiveTo` es `null` o `effectiveTo >= date`). La comparación de texto funciona porque
   * las fechas son `AAAA-MM-DD`: el orden lexicográfico coincide con el cronológico.
   *
   * @param collectorMembershipId - El cobrador.
   * @param date - Fecha de calendario (`AAAA-MM-DD`).
   */
  findActiveByCollectorAndDate(
    collectorMembershipId: string,
    date: string,
  ): Promise<readonly CollectionAssignment[]>;

  /** @param assignment - La asignación con sus datos ya actualizados (cerrarla con `effectiveTo`). */
  update(assignment: CollectionAssignment): Promise<void>;

  /**
   * Las asignaciones de un cobrador que todavía no terminaron a la fecha dada: las vigentes y las
   * programadas, sin repetir. La baja de un cobrador las usa para saber qué préstamos le quedan.
   *
   * @param collectorMembershipId - El cobrador.
   * @param asOf - Fecha de calendario (`AAAA-MM-DD`).
   */
  listOpenByCollector(
    collectorMembershipId: string,
    asOf: string,
  ): Promise<readonly CollectionAssignment[]>;

  /**
   * Cierra unas asignaciones y abre otras en una sola transacción: si una escritura falla, ninguna
   * queda a medias, y así un préstamo nunca se queda sin cobrador (PRODUCT.md §6).
   *
   * @param closed - Las asignaciones que terminan, con su `effectiveTo` ya puesto.
   * @param opened - Las asignaciones nuevas.
   */
  reassign(
    closed: readonly CollectionAssignment[],
    opened: readonly CollectionAssignment[],
  ): Promise<void>;
}
