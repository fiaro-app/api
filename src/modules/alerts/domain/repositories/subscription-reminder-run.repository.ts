/** Guarda qué días de negocio ya se mandaron los recordatorios de vencimiento del plan (D-150): un registro por día. */
export interface SubscriptionReminderRunRepository {
  /**
   * Reclama el día para este llamado. Solo el primero que lo reclama lo obtiene, y así no hay dos
   * envíos el mismo día, aunque haya varias instancias o el proceso se reinicie.
   *
   * @param businessDate - El día de negocio, AAAA-MM-DD, en hora de Colombia.
   * @returns `true` si el reclamo fue de este llamado; `false` si el día ya estaba reclamado.
   */
  claim(businessDate: string): Promise<boolean>;

  /**
   * Anota cómo terminó el envío del día reclamado.
   *
   * @param businessDate - El día reclamado.
   * @param remindersSent - A cuántas personas se les recordó.
   */
  finish(businessDate: string, remindersSent: number): Promise<void>;
}
