/** Una sesión abierta de una persona, sin su token: el token nunca sale de la base de datos. */
export interface ActiveSession {
  /** Identificador de la sesión. */
  readonly id: string;
  /** IP desde la que se abrió, o `null` si no se registró. */
  readonly ipAddress: string | null;
  /** `User-Agent` con el que se abrió, o `null` si no se registró. */
  readonly userAgent: string | null;
  /** Cuándo se abrió. */
  readonly createdAt: Date;
  /**
   * Último uso: se actualiza cuando la sesión se renueva, como máximo una vez al día
   * (`SESSION_REFRESH_INTERVAL_SECONDS`), así que es una aproximación de ese tamaño.
   */
  readonly lastUsedAt: Date;
  /** Cuándo vence si no se usa. */
  readonly expiresAt: Date;
}

/** Puerto de persistencia de las sesiones abiertas. */
export interface SessionRepository {
  /**
   * Cierra todas las sesiones de una persona (borra sus filas): quedan inválidas de inmediato.
   *
   * @param userId - La persona.
   * @returns Cuántas sesiones se cerraron.
   */
  revokeAllForUser(userId: string): Promise<number>;

  /**
   * @param userId - La persona.
   * @param now - El momento de la consulta: las sesiones que ya vencieron no cuentan.
   * @returns Sus sesiones vigentes, de la usada más recientemente a la menos.
   */
  listActiveForUser(
    userId: string,
    now: Date,
  ): Promise<readonly ActiveSession[]>;

  /**
   * Cierra una sesión puntual de la persona (borra su fila).
   *
   * @param sessionId - La sesión.
   * @param userId - La persona dueña: el borrado se acota a ella, así que un id ajeno no cierra nada.
   * @returns Si existía y se cerró.
   */
  revokeOne(sessionId: string, userId: string): Promise<boolean>;
}
