import type { MoraAlertsResult } from '@/modules/alerts/domain/mora/mora-alerts-result.js';

/** Guarda qué días de negocio ya se mandó el aviso de mora (D-96): un registro por día. */
export interface MoraAlertRunRepository {
  /**
   * Reclama el día para este llamado. Solo el primero que lo reclama lo obtiene, y así no hay dos
   * avisos el mismo día, aunque haya varias instancias o el proceso se reinicie.
   *
   * @param businessDate - El día de negocio, AAAA-MM-DD, en hora de Colombia.
   * @returns `true` si el reclamo fue de este llamado; `false` si el día ya estaba reclamado.
   */
  claim(businessDate: string): Promise<boolean>;

  /**
   * Anota cómo terminó el envío del día reclamado.
   *
   * @param businessDate - El día reclamado.
   * @param result - Lo que se envió.
   */
  finish(businessDate: string, result: MoraAlertsResult): Promise<void>;
}
