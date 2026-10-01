import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import type { LoanBalance } from '@/shared/domain/calendar/loan-balance.js';

/**
 * @param loanId - El préstamo consultado.
 * @param asOf - Fecha con la que se calculó.
 * @param balance - El resultado del motor de calendario/mora.
 */
export function toLoanBalanceDetails(
  loanId: string,
  asOf: string,
  balance: LoanBalance,
): LoanBalanceDetails {
  return {
    loanId,
    asOf,
    balance: balance.balance,
    totalExpectedToDate: balance.totalExpectedToDate,
    overdueAmount: balance.overdueAmount,
    overdueDays: balance.overdueDays,
    nextDueDate: balance.nextDueDate,
    firstOverdueDate: balance.firstOverdueDate,
  };
}
