/** Datos con los que se construye una {@link CollectionAssignment}. */
export interface CollectionAssignmentProps {
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

/**
 * Quién cobra un préstamo y durante qué fechas. Nunca se borra: reasignar cierra la asignación
 * vigente (`effectiveTo`) y abre una nueva, así queda el historial de quién cobraba cada día
 * (PRODUCT.md §5).
 */
export class CollectionAssignment {
  private constructor(
    public readonly id: string,
    public readonly loanId: string,
    public readonly collectorMembershipId: string,
    public readonly effectiveFrom: string,
    public readonly effectiveTo: string | null,
    public readonly createdAt: Date,
  ) {}

  /** @param props - Datos de la asignación. */
  static create(props: CollectionAssignmentProps): CollectionAssignment {
    return new CollectionAssignment(
      props.id,
      props.loanId,
      props.collectorMembershipId,
      props.effectiveFrom,
      props.effectiveTo,
      props.createdAt,
    );
  }
}
