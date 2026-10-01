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

  /** @param assignment - La asignación con sus datos ya actualizados (cerrarla con `effectiveTo`). */
  update(assignment: CollectionAssignment): Promise<void>;
}
