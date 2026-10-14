/** Los datos públicos de una asignación de cobro, tal como los describe `CollectionAssignmentSchema`. */
export interface CollectionAssignmentDetails {
  /** Identificador de la asignación (UUIDv7). */
  readonly id: string;
  /** El préstamo asignado. */
  readonly loanId: string;
  /** La membresía (rol `COLLECTOR`) que cobra. */
  readonly collectorMembershipId: string;
  /** Fecha `AAAA-MM-DD` desde la que rige. */
  readonly effectiveFrom: string;
  /** `null`: vigente sin fecha de fin. Igual a `effectiveFrom`: reemplazo de un solo día. */
  readonly effectiveTo: string | null;
  /** Cuándo se creó. */
  readonly createdAt: Date;
}

/** Datos con los que se da de alta una asignación de cobro. */
export interface CreateCollectionAssignmentInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** El préstamo a asignar. */
  readonly loanId: string;
  /** La membresía (rol `COLLECTOR`) que cobrará. */
  readonly collectorMembershipId: string;
  /** Fecha `AAAA-MM-DD` desde la que rige. */
  readonly effectiveFrom: string;
  /**
   * `null`/ausente: permanente — cierra la asignación vigente del préstamo, si tiene una. Igual
   * a `effectiveFrom`: reemplazo de un solo día, no toca la permanente.
   */
  readonly effectiveTo?: string | null;
}
