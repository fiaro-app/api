/** Qué período se pide, y de quién. */
export interface GetCollectorStatsInput {
  /** El cobrador de la sesión. */
  readonly collectorMembershipId: string;
  /** El prestamista con el que opera la sesión. */
  readonly lenderId: string;
  /** Primera fecha del rango (`AAAA-MM-DD`); por defecto, el primer día del mes actual. */
  readonly from?: string;
  /** Última fecha del rango (`AAAA-MM-DD`); por defecto, hoy. */
  readonly to?: string;
}

/** Desempeño de un cobrador en un período. */
export interface CollectorPeriodStats {
  /** Primera fecha del período. */
  readonly from: string;
  /** Última fecha del período. */
  readonly to: string;
  /**
   * Lo que el motor de calendario dice que vencía en el período, de los préstamos que el
   * cobrador tiene asignados hoy — no lo que las visitas registradas digan (D-98): así la cifra
   * no se infla dejando de visitar los casos difíciles.
   */
  readonly expectedAmount: number;
  /** Lo que de verdad cobró en el período, sin los pagos reversados. */
  readonly collectedAmount: number;
  /**
   * `collectedAmount / expectedAmount`, de 0 a 1. `null` si `expectedAmount` es cero (su cartera
   * no tenía nada que vencer en el período): la razón no está definida, no es ni 0 ni 1.
   */
  readonly effectiveness: number | null;
  /** Cuántas visitas hizo en el período, de cualquier resultado. */
  readonly visitsCount: number;
  /** Lo vencido y sin pagar hoy, de los préstamos que tiene asignados. */
  readonly overdueAmount: number;
}
