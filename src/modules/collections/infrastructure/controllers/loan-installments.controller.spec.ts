import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { GetLoanInstallmentsUseCase } from '@/modules/collections/application/use-cases/get-loan-installments.use-case.js';
import { LoanInstallmentsController } from '@/modules/collections/infrastructure/controllers/loan-installments.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  loanId: 'loan-1',
  asOf: '2026-09-27',
  installments: [
    {
      number: 1,
      dueDate: '2026-09-25',
      expectedAmount: 10_000,
      paidAmount: 10_000,
      status: 'PAID' as const,
    },
    {
      number: 2,
      dueDate: '2026-09-28',
      expectedAmount: 10_000,
      paidAmount: 0,
      status: 'PENDING' as const,
    },
  ],
};

const SCOPE: LenderScope = {
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
};

describe('LoanInstallmentsController', () => {
  it('publica GET, colgando de loans/:loanId/installments', () => {
    const handler = Reflect.get(
      LoanInstallmentsController.prototype,
      'getLoanInstallments',
    ) as object;
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod;
    expect(RequestMethod[method]).toBe('GET');
    expect(Reflect.getMetadata(PATH_METADATA, LoanInstallmentsController)).toBe(
      'loans/:loanId/installments',
    );
  });

  it('devuelve el calendario para cualquier rol, sin comprobar ninguno', async () => {
    const execute = vi.fn(() => Promise.resolve(DETAILS));
    const controller = new LoanInstallmentsController({
      execute,
    } as unknown as GetLoanInstallmentsUseCase);

    const response = await controller.getLoanInstallments('loan-1', SCOPE);

    expect(execute).toHaveBeenCalledExactlyOnceWith('loan-1', 'lender-1');
    expect(response).toEqual(DETAILS);
  });
});
