import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { LoanBalanceController } from '@/modules/collections/infrastructure/controllers/loan-balance.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  loanId: 'loan-1',
  asOf: '2026-09-27',
  balance: 30_000,
  totalExpectedToDate: 20_000,
  overdueAmount: 0,
  overdueDays: 0,
  nextDueDate: '2026-09-28',
  firstOverdueDate: null,
};

function setup() {
  const getLoanBalanceUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const controller = new LoanBalanceController(
    getLoanBalanceUseCase as unknown as GetLoanBalanceUseCase,
  );
  return { controller, getLoanBalanceUseCase };
}

const SCOPE: LenderScope = {
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
};

describe('LoanBalanceController', () => {
  it('publica GET, colgando de loans/:loanId/balance', () => {
    const handler = Reflect.get(
      LoanBalanceController.prototype,
      'getLoanBalance',
    ) as object;
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod;
    expect(RequestMethod[method]).toBe('GET');
    expect(Reflect.getMetadata(PATH_METADATA, LoanBalanceController)).toBe(
      'loans/:loanId/balance',
    );
  });

  it('devuelve el saldo para cualquier rol, sin comprobar ninguno', async () => {
    const { controller, getLoanBalanceUseCase } = setup();

    const response = await controller.getLoanBalance('loan-1', SCOPE);

    expect(getLoanBalanceUseCase.execute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
    expect(response.balance).toBe(30_000);
  });
});
