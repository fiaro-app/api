import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import { toLoanScheduleInput } from '@/modules/collections/application/services/to-loan-schedule-input.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { computeExpectedAmountInRange } from '@/shared/domain/calendar/period-expected.js';

/**
 * Lo que de verdad toca cobrarle a un préstamo en `date` (D-128): la cuota de ese día más la mora
 * que traía al empezarlo, sin pasar del saldo que le quedaba. Lo pagado por adelantado no se
 * descuenta de la cuota de hoy: solo reduce la mora y el saldo.
 *
 * @remarks
 * Todo se mide al cierre del día anterior, no con los pagos de hoy: así la cifra no se mueve
 * mientras el cobrador cobra, y un préstamo que hoy se salda sigue contando completo.
 *
 * @param loan - El préstamo.
 * @param lender - Su prestamista, de quien salen los días sin cobro.
 * @param records - Las visitas del préstamo, con sus pagos y reversiones.
 * @param date - El día (`AAAA-MM-DD`).
 */
export function computeExpectedForDay(
  loan: LoanDetails,
  lender: LenderDetails,
  records: readonly CollectionVisitRecord[],
  date: string,
): number {
  const yesterday = addDays(date, -1);
  const started = loan.startDate <= yesterday;
  const opening = started
    ? calculateLoanBalance({
        loan,
        lender,
        records,
        today: date,
        asOf: yesterday,
      })
    : null;
  const balance = opening?.balance ?? loan.totalPayable;
  const arrears = opening?.overdueAmount ?? 0;
  const dueToday = computeExpectedAmountInRange(
    toLoanScheduleInput(loan, lender),
    date,
    date,
  );
  return Math.min(balance, arrears + dueToday);
}
