/** Los datos públicos de una cartera, tal como los describe `PortfolioSchema`. */
export interface PortfolioDetails {
  /** Identificador de la cartera (UUIDv7). */
  readonly id: string;
  /** Nombre de la cartera. */
  readonly name: string;
  /** La cartera por defecto no se puede eliminar. */
  readonly isDefault: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}

/** Datos con los que se da de alta una cartera. */
export interface CreatePortfolioInput {
  /** El prestamista dueño, resuelto por `LenderScopeGuard`. */
  readonly lenderId: string;
  /** Nombre de la cartera. */
  readonly name: string;
}
