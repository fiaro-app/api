import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CancelLoanUseCase } from '@/modules/loans/application/use-cases/cancel-loan.use-case.js';
import type { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { LoanController } from '@/modules/loans/infrastructure/controllers/loan.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'loan-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY' as const,
  startDate: '2026-10-01',
  status: 'ACTIVE' as const,
  createdByMembershipId: 'membership-1',
  createdAt: new Date('2026-09-30T00:00:00Z'),
  closedAt: null,
};

function setup() {
  const createLoanUseCase = { execute: vi.fn(() => Promise.resolve(DETAILS)) };
  const getLoanUseCase = { execute: vi.fn(() => Promise.resolve(DETAILS)) };
  const cancelLoanUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({ ...DETAILS, status: 'CANCELED' as const }),
    ),
  };
  const controller = new LoanController(
    createLoanUseCase as unknown as CreateLoanUseCase,
    getLoanUseCase as unknown as GetLoanUseCase,
    cancelLoanUseCase as unknown as CancelLoanUseCase,
  );
  return {
    controller,
    createLoanUseCase,
    getLoanUseCase,
    cancelLoanUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

const CREATE_BODY = {
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY' as const,
  startDate: '2026-10-01',
};

describe('LoanController', () => {
  it('publica POST, GET y POST /:id/cancel, todas colgando de /loans', () => {
    const publishedRoutes = Object.getOwnPropertyNames(LoanController.prototype)
      .flatMap((name) => {
        const handler = Reflect.get(LoanController.prototype, name) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['GET', 'POST', 'POST'].sort());
    expect(Reflect.getMetadata(PATH_METADATA, LoanController)).toBe('loans');
  });

  describe('createLoan', () => {
    it('con rol OWNER crea el préstamo', async () => {
      const { controller, createLoanUseCase } = setup();

      const response = await controller.createLoan(
        CREATE_BODY,
        scopeWith(['OWNER']),
      );

      expect(createLoanUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        membershipId: 'membership-1',
        ...CREATE_BODY,
      });
      expect(response.id).toBe('loan-1');
    });

    it('con rol LENDER también crea', async () => {
      const { controller, createLoanUseCase } = setup();

      await controller.createLoan(CREATE_BODY, scopeWith(['LENDER']));

      expect(createLoanUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, createLoanUseCase } = setup();

      const error = await controller
        .createLoan(CREATE_BODY, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(createLoanUseCase.execute).not.toHaveBeenCalled();
    });

    it('sin ningún rol conocido responde 403 sin llamar al caso de uso', async () => {
      const { controller, createLoanUseCase } = setup();

      const error = await controller
        .createLoan(CREATE_BODY, scopeWith([]))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(createLoanUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getLoan', () => {
    it('devuelve el préstamo para cualquier rol, incluido COLLECTOR', async () => {
      const { controller, getLoanUseCase } = setup();

      const response = await controller.getLoan(
        'loan-1',
        scopeWith(['COLLECTOR']),
      );

      expect(getLoanUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        'loan-1',
        'lender-1',
      );
      expect(response.id).toBe('loan-1');
    });
  });

  describe('cancelLoan', () => {
    it('con rol OWNER cancela el préstamo', async () => {
      const { controller, cancelLoanUseCase } = setup();

      const response = await controller.cancelLoan(
        'loan-1',
        scopeWith(['OWNER']),
      );

      expect(cancelLoanUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        'loan-1',
        'lender-1',
      );
      expect(response.status).toBe('CANCELED');
    });

    it('con rol LENDER también cancela', async () => {
      const { controller, cancelLoanUseCase } = setup();

      await controller.cancelLoan('loan-1', scopeWith(['LENDER']));

      expect(cancelLoanUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, cancelLoanUseCase } = setup();

      const error = await controller
        .cancelLoan('loan-1', scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(cancelLoanUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
