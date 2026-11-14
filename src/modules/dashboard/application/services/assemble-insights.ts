import type { LenderInsights } from '@/modules/dashboard/application/dtos/lender-insights.dto.js';
import {
  buildDailySeries,
  settlementIntegrity,
  totalsByMethod,
  visitMix,
  type PaymentDayRow,
  type VisitOutcomeCounts,
} from '@/modules/dashboard/domain/insights.js';
import type {
  IncomeTotals,
  OriginationTotals,
  SettlementAmounts,
} from '@/modules/dashboard/domain/repositories/insights-read.repository.js';
import {
  addDays,
  type DatePeriod,
} from '@/shared/domain/calendar/business-date.js';

/** Cuántos días hacia adelante mira la proyección de cobros. */
export const FORECAST_DAYS = 7;

/** Todo lo que se leyó para armar las estadísticas. */
export interface InsightsData {
  readonly period: DatePeriod;
  readonly previous: DatePeriod;
  readonly today: string;
  /** Lo que vencía cada día del período (`fecha` → pesos). */
  readonly expected: ReadonlyMap<string, number>;
  /** Lo que vence en los próximos días (`fecha` → pesos). */
  readonly upcoming: ReadonlyMap<string, number>;
  readonly payments: readonly PaymentDayRow[];
  readonly income: IncomeTotals;
  readonly origination: OriginationTotals;
  readonly visits: VisitOutcomeCounts;
  readonly settlements: readonly SettlementAmounts[];
  readonly before: IncomeTotals;
  readonly beforeOrigination: OriginationTotals;
}

/**
 * Arma la respuesta de las estadísticas con lo ya leído: función pura, sin base de datos.
 *
 * @param data - Lo leído del período, del anterior y del calendario.
 */
export function assembleInsights(data: InsightsData): LenderInsights {
  const { income, origination } = data;
  return {
    from: data.period.from,
    to: data.period.to,
    daily: buildDailySeries(
      data.period.from,
      data.period.to,
      data.payments,
      data.expected,
    ),
    income: {
      collected: income.collected,
      byMethod: totalsByMethod(data.payments),
      interest: income.interest,
      principalRecovered: income.collected - income.interest,
      interestShare:
        income.collected === 0 ? null : income.interest / income.collected,
    },
    origination: {
      loansCreated: origination.loansCreated,
      amountLent: origination.amountLent,
      averageTicket:
        origination.loansCreated === 0
          ? null
          : Math.round(origination.amountLent / origination.loansCreated),
      agreedInterest: origination.totalPayable - origination.amountLent,
    },
    visits: visitMix(data.visits),
    settlements: settlementIntegrity(data.settlements),
    forecast: Array.from({ length: FORECAST_DAYS }, (_, index) => {
      const date = addDays(data.today, index + 1);
      return { date, expected: data.upcoming.get(date) ?? 0 };
    }),
    previous: {
      from: data.previous.from,
      to: data.previous.to,
      collected: data.before.collected,
      interest: data.before.interest,
      loansCreated: data.beforeOrigination.loansCreated,
      amountLent: data.beforeOrigination.amountLent,
    },
  };
}
