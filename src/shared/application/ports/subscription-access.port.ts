/** Dice si el plan del negocio permite escribir (PRODUCT.md §7). */
export interface SubscriptionAccess {
  /**
   * @param lenderId - El prestamista con el que opera la sesión.
   * @returns `true` si la suscripción de su Tenant terminó la gracia y es solo lectura. Un
   * Tenant sin suscripción (alta caída a medias, D-115) no se bloquea.
   */
  isReadOnly(lenderId: string): Promise<boolean>;
}
