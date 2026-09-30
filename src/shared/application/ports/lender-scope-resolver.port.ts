/** El Lender con el que opera una sesión, y con qué roles. */
export interface LenderScope {
  /** La membresía de la que sale este alcance. */
  readonly membershipId: string;
  /** El Lender con el que opera la sesión. */
  readonly lenderId: string;
  /** Los roles de la persona sobre ese Lender. */
  readonly roles: readonly string[];
}

/** Resuelve con qué Lender opera una persona autenticada. */
export interface LenderScopeResolver {
  /**
   * @param userId - La persona autenticada.
   * @returns Su alcance, o `null` si no tiene ninguna membresía activa.
   */
  resolve(userId: string): Promise<LenderScope | null>;
}
