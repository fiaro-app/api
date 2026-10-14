/**
 * Serializa, por prestamista, las escrituras que primero cuentan o buscan y después crean (el
 * límite de cobradores del plan, la cédula única dentro del negocio): sin el candado, dos
 * peticiones simultáneas pasan la misma revisión y ambas crean.
 */
export interface LenderLock {
  /**
   * Corre `work` cuando ninguna otra llamada con el mismo `lenderId` está corriendo, en este
   * proceso o en cualquier otra instancia de la API.
   *
   * @param lenderId - El prestamista cuyo candado se toma.
   * @param work - Lo que se hace con el candado tomado.
   * @returns Lo que devuelve `work`.
   */
  runExclusive<T>(lenderId: string, work: () => Promise<T>): Promise<T>;
}
