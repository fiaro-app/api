import { describe, expect, it } from 'vitest';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import { toLoanBalanceResponse } from '@/modules/collections/infrastructure/controllers/schemas/loan-balance-responses.schema.js';

const DETAILS: LoanBalanceDetails = {
  loanId: 'loan-1',
  asOf: '2026-09-27',
  balance: 30_000,
  totalExpectedToDate: 20_000,
  overdueAmount: 10_000,
  overdueDays: 1,
  nextDueDate: '2026-09-26',
  firstOverdueDate: '2026-09-26',
};

describe('toLoanBalanceResponse', () => {
  it('expone los mismos datos que el caso de uso', () => {
    expect(toLoanBalanceResponse(DETAILS)).toEqual(DETAILS);
  });
});
