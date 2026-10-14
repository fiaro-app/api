/** Lee del plan del negocio cuántos cobradores activos puede tener un prestamista. */
export interface CollectorSeatLimit {
  /**
   * @param lenderId - El prestamista.
   * @returns El tope del plan de su Tenant, o `null` si el Tenant no tiene suscripción (alta
   * caída a medias, D-115): sin plan no hay tope que aplicar.
   */
  maxCollectors(lenderId: string): Promise<number | null>;
}
