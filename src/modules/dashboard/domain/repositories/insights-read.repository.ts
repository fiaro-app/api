import type {
  InsightsPaymentMethod,
  PaymentDayRow,
  VisitOutcomeCounts,
} from '@/modules/dashboard/domain/insights.js';

/** Lo colocado en un período: préstamos nuevos y el dinero prestado. */
export interface OriginationTotals {
  readonly loansCreated: number;
  /** Suma del capital prestado. */
  readonly amountLent: number;
  /** Suma de lo que esos préstamos devuelven en total (capital más interés). */
  readonly totalPayable: number;
}

/** Lo cobrado en un período, partido en capital recuperado e interés ganado. */
export interface IncomeTotals {
  /** Pagos sin reversión. */
  readonly collected: number;
  /** La parte de esos pagos que es interés: cada pago se reparte en la proporción capital/interés de su préstamo. */
  readonly interest: number;
}

/** El cuadre de un día de un cobrador, tal como lo declaró. */
export interface SettlementAmounts {
  readonly expectedAmount: number;
  readonly collectedAmount: number;
}

/**
 * Lecturas agregadas para las estadísticas del prestamista (D-133): sumas y conteos hechos en la
 * base de datos, sin traer cada fila. Es un modelo de lectura: no escribe nada.
 */
export interface InsightsReadRepository {
  /**
   * @param lenderId - El prestamista.
   * @param from - Primera fecha (`AAAA-MM-DD`, hora de Bogotá).
   * @param to - Última fecha, inclusive.
   * @returns Lo cobrado por día y medio de pago, sin los pagos reversados.
   */
  paymentsByDay(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<readonly PaymentDayRow[]>;

  /** @returns Cuánto se cobró en total y cuánto de eso es interés. */
  income(lenderId: string, from: string, to: string): Promise<IncomeTotals>;

  /** @returns Los préstamos cuya fecha de inicio cae en el rango. */
  originations(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<OriginationTotals>;

  /** @returns Cuántas visitas hubo de cada resultado en el rango. */
  visitOutcomes(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<VisitOutcomeCounts>;

  /** @returns Los cuadres enviados en el rango (por la fecha del cuadre). */
  settlements(
    lenderId: string,
    from: string,
    to: string,
  ): Promise<readonly SettlementAmounts[]>;
}

export type { InsightsPaymentMethod };
