/** Lo que hay que saber del negocio para revisar una hoja antes de importarla. */
export interface ImportLookups {
  /**
   * @param lenderId - El prestamista.
   * @param nationalIds - Cédulas ya normalizadas.
   * @returns Los clientes que ya existen, por cédula → id.
   */
  existingClients(
    lenderId: string,
    nationalIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>>;

  /**
   * @param lenderId - El prestamista.
   * @returns Sus cobradores activos, por celular (E.164) → id de la membresía.
   */
  activeCollectors(lenderId: string): Promise<ReadonlyMap<string, string>>;
}
