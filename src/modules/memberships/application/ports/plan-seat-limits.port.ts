/** Lee del plan del negocio cuántos cupos de colaboradores tiene un prestamista. */
export interface PlanSeatLimits {
  /**
   * @param lenderId - El prestamista.
   * @returns El tope de cobradores activos del plan de su Tenant, o `null` si el Tenant no tiene
   * suscripción (alta caída a medias, D-115): sin plan no hay tope que aplicar.
   */
  maxCollectors(lenderId: string): Promise<number | null>;

  /**
   * @param lenderId - El prestamista.
   * @returns El tope de administradores activos (el dueño incluido), o `null` sin suscripción.
   */
  maxAdmins(lenderId: string): Promise<number | null>;
}
