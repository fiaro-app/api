/**
 * Qué datos del prestamista puede ver un cobrador que no administra: solo los préstamos que
 * tiene o tuvo asignados y los clientes de esos préstamos.
 */
export interface CollectorAccess {
  /**
   * @param collectorMembershipId - El cobrador.
   * @param loanId - El préstamo.
   * @returns Si tiene o tuvo ese préstamo asignado.
   */
  canAccessLoan(
    collectorMembershipId: string,
    loanId: string,
  ): Promise<boolean>;

  /**
   * @param collectorMembershipId - El cobrador.
   * @param clientId - El cliente.
   * @returns Si tiene o tuvo asignado algún préstamo de ese cliente.
   */
  canAccessClient(
    collectorMembershipId: string,
    clientId: string,
  ): Promise<boolean>;
}
