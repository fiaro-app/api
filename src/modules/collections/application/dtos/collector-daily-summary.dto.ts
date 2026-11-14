import type { CollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.dto.js';
import type { PaymentAmountsByMethod } from '@/modules/collections/application/services/sum-net-payments-by-method.js';

/** Qué día se pide, y de quién. */
export interface GetCollectorDailySummaryInput {
  /** El cobrador de la sesión. */
  readonly collectorMembershipId: string;
  /** El prestamista con el que opera la sesión. */
  readonly lenderId: string;
  /** Fecha de calendario (`AAAA-MM-DD`); por defecto, hoy. */
  readonly date?: string;
}

/** Resumen del día de un cobrador, antes de que confirme su cuadre. */
export interface CollectorDailySummary {
  /** La fecha del resumen. */
  readonly date: string;
  /** Lo que el motor de calendario dice que vencía hoy, de los préstamos que tiene asignados. */
  readonly expectedAmount: number;
  /** Lo que de verdad cobró hoy, sin los pagos reversados. */
  readonly collectedAmount: number;
  /** `collectedAmount`, desglosado por medio de pago. */
  readonly collectedByMethod: PaymentAmountsByMethod;
  /** Cuántos préstamos tiene hoy en su ruta (los asignados que cuentan para lo esperado). */
  readonly routeLoans: number;
  /** De esos, cuántos ya visitó hoy (con cualquier resultado). */
  readonly visitedLoans: number;
  /** Sus visitas de hoy, de la más antigua a la más nueva. */
  readonly visits: readonly CollectionVisitDetails[];
}
