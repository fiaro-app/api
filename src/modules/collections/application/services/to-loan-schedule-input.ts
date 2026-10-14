import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { PeriodExpectedInput } from '@/shared/domain/calendar/period-expected.js';

/**
 * Arma lo que el motor de calendario necesita de un préstamo y su prestamista: la frecuencia de
 * cobro y los días sin cobro de quien lo presta, nunca del préstamo mismo (D-72).
 *
 * @param loan - El préstamo.
 * @param lender - Su prestamista dueño.
 */
export function toLoanScheduleInput(
  loan: LoanDetails,
  lender: LenderDetails,
): PeriodExpectedInput {
  return {
    startDate: loan.startDate,
    frequency: loan.frequency,
    installmentCount: loan.installmentCount,
    installmentValue: loan.installmentValue,
    nonWorkingWeekdays: lender.nonWorkingWeekdays,
    skipNationalHolidays: lender.skipNationalHolidays,
  };
}
