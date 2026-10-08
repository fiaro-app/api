/** Un préstamo que se le quita a un cobrador dado de baja y el cobrador que lo recibe. */
export interface CollectorReassignmentInput {
  /** El préstamo; debe ser uno que el cobrador tiene asignado hoy. */
  readonly loanId: string;
  /** El cobrador nuevo: activo y con el rol `COLLECTOR` en el mismo prestamista. */
  readonly collectorMembershipId: string;
}

/** Datos con los que se da de baja a un cobrador reasignando sus préstamos. */
export interface DeactivateCollectorInput {
  /** El prestamista dueño, tal como lo resolvió `LenderScopeGuard`. */
  readonly lenderId: string;
  /** El cobrador que se da de baja. */
  readonly collectorMembershipId: string;
  /** A quién pasa cada préstamo activo que tenía asignado hoy. */
  readonly reassignments: readonly CollectorReassignmentInput[];
}

/** Lo que devuelve la baja de un cobrador. */
export interface DeactivateCollectorResult {
  /** La membresía del cobrador, ya `INACTIVE`. */
  readonly membershipId: string;
  /** Cuántos préstamos activos cambiaron de cobrador. */
  readonly reassignedLoans: number;
}
