import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { computeExpectedInstallmentDates } from '@/shared/domain/calendar/loan-schedule.js';

/**
 * Lo que vence cada día según el calendario de los préstamos: la cuota de cada préstamo en cada
 * fecha en que le toca pagar (frecuencia, días sin cobro y festivos del prestamista).
 *
 * @param loans - Los préstamos a considerar.
 * @param lender - El prestamista, de quien salen los días sin cobro.
 * @param from - Primera fecha (`AAAA-MM-DD`).
 * @param to - Última fecha, inclusive.
 * @returns `fecha` → pesos, solo con los días en que algo vence.
 */
export function expectedByDay(
  loans: readonly LoanDetails[],
  lender: Pick<LenderDetails, 'nonWorkingWeekdays' | 'skipNationalHolidays'>,
  from: string,
  to: string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const loan of loans) {
    const dates = computeExpectedInstallmentDates({
      startDate: loan.startDate,
      frequency: loan.frequency,
      installmentCount: loan.installmentCount,
      nonWorkingWeekdays: lender.nonWorkingWeekdays,
      skipNationalHolidays: lender.skipNationalHolidays,
    });
    for (const date of dates) {
      if (date >= from && date <= to) {
        totals.set(date, (totals.get(date) ?? 0) + loan.installmentValue);
      }
    }
  }
  return totals;
}
