import { describe, expect, it, vi } from 'vitest';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-09-27T12:00:00-05:00'); // 2026-09-27 en hora de Colombia

const LOAN = {
  id: 'loan-1',
  startDate: '2026-09-24',
  frequency: 'DAILY',
  installmentCount: 5,
  installmentValue: 10_000,
  totalPayable: 50_000,
  status: 'ACTIVE',
};

const LENDER = {
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
} as never;

function paidVisit(id: string, amount: number): CollectionVisitRecord {
  const occurredAt = NOW;
  return {
    visit: CollectionVisit.create({
      id,
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      occurredAt,
      createdAt: occurredAt,
    }),
    payment: Payment.create({
      id: `${id}-payment`,
      loanId: 'loan-1',
      visitId: id,
      amount,
      method: 'CASH',
      occurredAt,
      createdAt: occurredAt,
    }),
    reversal: null,
  };
}

/** Un `paidVisit` cuyo pago ya fue reversado: no debe sumar al saldo. */
function reversedVisit(id: string, amount: number): CollectionVisitRecord {
  return {
    ...paidVisit(id, amount),
    reversal: PaymentReversal.create({
      id: `${id}-reversal`,
      paymentId: `${id}-payment`,
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-2',
      createdAt: NOW,
    }),
  };
}

function setup(records: readonly CollectionVisitRecord[] = []) {
  const listByLoan = vi.fn(() => Promise.resolve(records));
  const visits: CollectionVisitRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(null)),
    listByLoan,
    listByCollectorAndPromisedDate: vi.fn(),
  };
  const getLoanExecute = vi.fn(() => Promise.resolve(LOAN));
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  const getLenderExecute = vi.fn(() => Promise.resolve(LENDER));
  const getLender = {
    execute: getLenderExecute,
  } as unknown as GetLenderUseCase;
  const clock: Clock = { now: () => NOW };
  const useCase = new GetLoanBalanceUseCase(visits, getLoan, getLender, clock);
  return { useCase, listByLoan, getLoanExecute, getLenderExecute };
}

describe('GetLoanBalanceUseCase', () => {
  it('calcula el saldo con la fecha de hoy, en hora de Colombia', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(result.loanId).toBe('loan-1');
    expect(result.asOf).toBe('2026-09-27');
  });

  it('valida el préstamo y el prestamista con el id correcto', async () => {
    const { useCase, getLoanExecute, getLenderExecute } = setup();

    await useCase.execute('loan-1', 'lender-1');

    expect(getLoanExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
    expect(getLenderExecute).toHaveBeenCalledExactlyOnceWith('lender-1');
  });

  it('suma los pagos de las visitas del préstamo, ignorando las que no dejaron dinero', async () => {
    const notFoundVisit: CollectionVisitRecord = {
      visit: CollectionVisit.create({
        id: 'visit-not-found',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        outcome: 'NOT_FOUND',
        expectedAmount: 10_000,
        promisedDate: null,
        occurredAt: NOW,
        createdAt: NOW,
      }),
      payment: null,
      reversal: null,
    };
    const { useCase } = setup([
      paidVisit('visit-1', 10_000),
      paidVisit('visit-2', 10_000),
      notFoundVisit,
    ]);

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(result.balance).toBe(30_000);
    expect(result.overdueAmount).toBe(0); // 20.000 esperado al 27, 20.000 pagado
  });

  it('un pago reversado no cuenta para el saldo', async () => {
    const { useCase } = setup([
      paidVisit('visit-1', 10_000),
      reversedVisit('visit-2', 10_000),
    ]);

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(result.balance).toBe(40_000); // 50.000 - 10.000 (el otro quedó reversado)
    expect(result.overdueAmount).toBe(10_000); // 20.000 esperado - 10.000 neto
  });

  it('un préstamo cerrado no tiene mora', async () => {
    const closedLoan = { ...LOAN, status: 'PAID_OFF' };
    const getLoan = {
      execute: vi.fn(() => Promise.resolve(closedLoan)),
    } as never;
    const getLender = {
      execute: vi.fn(() => Promise.resolve(LENDER)),
    } as never;
    const visits: CollectionVisitRepository = {
      create: vi.fn(() => Promise.resolve()),
      findById: vi.fn(() => Promise.resolve(null)),
      listByLoan: vi.fn(() => Promise.resolve([])),
      listByCollectorAndPromisedDate: vi.fn(),
    };
    const clock: Clock = { now: () => NOW };
    const closedUseCase = new GetLoanBalanceUseCase(
      visits,
      getLoan,
      getLender,
      clock,
    );

    const result = await closedUseCase.execute('loan-1', 'lender-1');

    expect(result.overdueAmount).toBe(0);
    expect(result.nextDueDate).toBeNull();
  });
});
