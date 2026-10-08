import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';

/** El resumen del Lender al abrir la app (PROTOTIPO-FLUJOS.md §4.6). */
export interface LenderDashboard {
  /** Suma del saldo pendiente de los préstamos `ACTIVE`. */
  readonly totalPortfolio: number;
  /** Lo cobrado hoy, sumado entre todos los cobradores. */
  readonly collectedToday: number;
  /** Membresías `COLLECTOR` activas. */
  readonly activeCollectors: number;
  /** Membresías `COLLECTOR`, activas o no. */
  readonly totalCollectors: number;
  /**
   * `collectedToday` sobre lo que el motor de calendario esperaba cobrar hoy, sumado entre todos
   * los cobradores activos. `null` si no había nada esperado hoy.
   */
  readonly effectivenessToday: number | null;
  /** Clientes distintos con al menos un préstamo en mora hoy. */
  readonly clientsInArrears: number;
  /** Alertas de texto ya armadas (PROTOTIPO-FLUJOS.md §4.6); vacío si ninguna aplica. */
  readonly alerts: readonly string[];
  /** Los cuadres `PENDING` del Lender, para revisar. */
  readonly pendingSettlements: readonly SettlementDetails[];
}
