import { addDays } from '@/shared/domain/calendar/business-date.js';

/** Medios de pago, en el orden en que se muestran. */
export const PAYMENT_METHODS = ['CASH', 'NEQUI', 'TRANSFER'] as const;
export type InsightsPaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Lo cobrado (sin reversiones) en un día con un medio de pago. */
export interface PaymentDayRow {
  readonly date: string;
  readonly method: InsightsPaymentMethod;
  readonly amount: number;
  readonly count: number;
}

/** Un día de la serie: lo que vencía según el calendario y lo que de verdad se cobró. */
export interface DailyPoint {
  readonly date: string;
  readonly expected: number;
  readonly collected: number;
}

/** Cuántas visitas hubo de cada resultado en el período. */
export interface VisitOutcomeCounts {
  readonly PAID: number;
  readonly NOT_FOUND: number;
  readonly REFUSED: number;
  readonly RESCHEDULED: number;
}

/** La mezcla de resultados de las visitas, con las dos tasas que importan. */
export interface VisitMix extends VisitOutcomeCounts {
  readonly total: number;
  /** Visitas en las que se encontró al cliente (todas menos `NOT_FOUND`) sobre el total; `null` sin visitas. */
  readonly contactRate: number | null;
  /** Visitas que terminaron en pago sobre el total; `null` sin visitas. */
  readonly paidRate: number | null;
}

/** Cuántos cuadres se enviaron y cuántos no cuadraban, con el dinero que faltó o sobró. */
export interface SettlementIntegrity {
  readonly submitted: number;
  readonly balanced: number;
  readonly withDifference: number;
  /** Suma de lo que faltó (esperado − cobrado) en los cuadres que quedaron cortos. */
  readonly shortfall: number;
  /** Suma de lo que sobró en los cuadres que cobraron de más. */
  readonly surplus: number;
}

/** Fechas de `from` a `to`, ambas incluidas. @throws {@link RangeError} si `to` es anterior a `from`. */
export function datesBetween(from: string, to: string): string[] {
  if (to < from) {
    throw new RangeError('La fecha final es anterior a la inicial.');
  }
  const dates: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    dates.push(day);
  }
  return dates;
}

/**
 * La serie diaria del período: cada fecha, aunque ese día no se haya cobrado nada, con lo esperado
 * por el calendario y lo cobrado.
 *
 * @param from - Primera fecha.
 * @param to - Última fecha.
 * @param payments - Lo cobrado por día y medio.
 * @param expectedByDay - Lo que vencía cada día (`fecha` → pesos).
 */
export function buildDailySeries(
  from: string,
  to: string,
  payments: readonly PaymentDayRow[],
  expectedByDay: ReadonlyMap<string, number>,
): DailyPoint[] {
  const collectedByDay = new Map<string, number>();
  for (const row of payments) {
    collectedByDay.set(
      row.date,
      (collectedByDay.get(row.date) ?? 0) + row.amount,
    );
  }
  return datesBetween(from, to).map((date) => ({
    date,
    expected: expectedByDay.get(date) ?? 0,
    collected: collectedByDay.get(date) ?? 0,
  }));
}

/** @param payments - Lo cobrado por día y medio. @returns Lo cobrado por cada medio de pago, siempre con los tres. */
export function totalsByMethod(
  payments: readonly PaymentDayRow[],
): Record<InsightsPaymentMethod, number> {
  const totals = { CASH: 0, NEQUI: 0, TRANSFER: 0 };
  for (const row of payments) {
    totals[row.method] += row.amount;
  }
  return totals;
}

/** @param counts - Visitas por resultado. */
export function visitMix(counts: VisitOutcomeCounts): VisitMix {
  const total =
    counts.PAID + counts.NOT_FOUND + counts.REFUSED + counts.RESCHEDULED;
  return {
    ...counts,
    total,
    contactRate: total === 0 ? null : (total - counts.NOT_FOUND) / total,
    paidRate: total === 0 ? null : counts.PAID / total,
  };
}

/** @param settlements - Los cuadres enviados en el período (esperado y cobrado de cada uno). */
export function settlementIntegrity(
  settlements: readonly {
    readonly expectedAmount: number;
    readonly collectedAmount: number;
  }[],
): SettlementIntegrity {
  let shortfall = 0;
  let surplus = 0;
  let balanced = 0;
  for (const { expectedAmount, collectedAmount } of settlements) {
    const difference = collectedAmount - expectedAmount;
    if (difference === 0) {
      balanced += 1;
    } else if (difference < 0) {
      shortfall -= difference;
    } else {
      surplus += difference;
    }
  }
  return {
    submitted: settlements.length,
    balanced,
    withDifference: settlements.length - balanced,
    shortfall,
    surplus,
  };
}
