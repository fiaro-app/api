/** Una dueña del negocio y el prestamista con el que trabaja. */
export interface TenantOwner {
  readonly userId: string;
  readonly lenderId: string;
}

/**
 * Quién es la dueña de un negocio: a ella se le avisa de los pagos y del vencimiento del plan
 * (D-150). Solo el rol `OWNER` paga la suscripción, así que no se avisa a los demás administradores.
 */
export interface TenantOwners {
  /**
   * @param tenantId - El negocio.
   * @returns Sus dueñas con membresía activa; vacío si no hay ninguna.
   */
  ownersOf(tenantId: string): Promise<readonly TenantOwner[]>;
}
