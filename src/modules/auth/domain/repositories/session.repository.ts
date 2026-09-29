/** Puerto de persistencia de las sesiones abiertas. */
export interface SessionRepository {
  /**
   * Cierra todas las sesiones de una persona (borra sus filas): quedan inválidas de inmediato.
   *
   * @param userId - La persona.
   * @returns Cuántas sesiones se cerraron.
   */
  revokeAllForUser(userId: string): Promise<number>;
}
