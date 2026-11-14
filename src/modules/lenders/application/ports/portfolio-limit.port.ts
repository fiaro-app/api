/** Lee del plan del negocio cuántas carteras puede tener un prestamista, la «General» incluida. */
export interface PortfolioLimit {
  /**
   * @param lenderId - El prestamista.
   * @returns El tope del plan de su Tenant, o `null` si el Tenant no tiene suscripción (alta
   * caída a medias, D-115): sin plan no hay tope que aplicar.
   */
  maxPortfolios(lenderId: string): Promise<number | null>;
}
