import { describe, expect, it } from 'vitest';
import { toLoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.mapper.js';
import type { LoanBalance } from '@/shared/domain/calendar/loan-balance.js';

const BALANCE: LoanBalance = {
  balance: 30_000,
  totalExpectedToDate: 20_000,
  overdueAmount: 0,
  overdueDays: 0,
  nextDueDate: '2026-09-28',
  firstOverdueDate: null,
};

describe('toLoanBalanceDetails', () => {
  it('junta el préstamo, la fecha de corte y el resultado del motor de calendario', () => {
    expect(toLoanBalanceDetails('loan-1', '2026-09-27', BALANCE)).toEqual({
      loanId: 'loan-1',
      asOf: '2026-09-27',
      balance: 30_000,
      totalExpectedToDate: 20_000,
      overdueAmount: 0,
      overdueDays: 0,
      nextDueDate: '2026-09-28',
      firstOverdueDate: null,
    });
  });
});
