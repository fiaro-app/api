/** Lee del plan del negocio cuántos préstamos activos puede tener un prestamista. */
export interface ActiveLoanLimit {
  /**
   * @param lenderId - El prestamista.
   * @returns El tope del plan de su Tenant, o `null` si el plan no lo limita o el Tenant no tiene
   * suscripción (alta caída a medias, D-115): en ambos casos no hay tope que aplicar.
   */
  maxActiveLoans(lenderId: string): Promise<number | null>;
}
