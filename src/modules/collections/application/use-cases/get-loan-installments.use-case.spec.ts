import { describe, expect, it, vi } from 'vitest';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { GetLoanInstallmentsUseCase } from '@/modules/collections/application/use-cases/get-loan-installments.use-case.js';
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
};

function paidVisit(id: string, amount: number): CollectionVisitRecord {
  return {
    visit: CollectionVisit.create({
      id,
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      occurredAt: NOW,
      createdAt: NOW,
    }),
    payment: Payment.create({
      id: `${id}-payment`,
      loanId: 'loan-1',
      visitId: id,
      amount,
      method: 'CASH',
      occurredAt: NOW,
      createdAt: NOW,
    }),
    reversal: null,
  };
}

function setup(
  records: readonly CollectionVisitRecord[] = [],
  loan: typeof LOAN = LOAN,
) {
  const visits: CollectionVisitRepository = {
    create: vi.fn(() => Promise.resolve()),
    findById: vi.fn(() => Promise.resolve(null)),
    listByLoan: vi.fn(() => Promise.resolve(records)),
    listByCollectorAndPromisedDate: vi.fn(),
    listByCollectorAndDateRange: vi.fn(),
    summarizeByCollectorAndDateRange: vi.fn(),
  };
  const getLoanExecute = vi.fn(() => Promise.resolve(loan));
  const getLenderExecute = vi.fn(() => Promise.resolve(LENDER));
  const clock: Clock = { now: () => NOW };
  const useCase = new GetLoanInstallmentsUseCase(
    visits,
    { execute: getLoanExecute } as unknown as GetLoanUseCase,
    { execute: getLenderExecute } as unknown as GetLenderUseCase,
    clock,
  );
  return { useCase, getLoanExecute, getLenderExecute };
}

describe('GetLoanInstallmentsUseCase', () => {
  it('arma el calendario con la fecha de hoy, en hora de Colombia', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(result.loanId).toBe('loan-1');
    expect(result.asOf).toBe('2026-09-27');
    // Diario sin domingos desde el jueves 24: 25, 26, 28, 29 y 30.
    expect(result.installments.map((row) => row.dueDate)).toEqual([
      '2026-09-25',
      '2026-09-26',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
    ]);
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

  it('imputa a las cuotas los pagos de las visitas', async () => {
    const { useCase } = setup([
      paidVisit('v1', 10_000),
      paidVisit('v2', 5_000),
    ]);

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(
      result.installments.map((row) => [row.paidAmount, row.status]),
    ).toEqual([
      [10_000, 'PAID'],
      [5_000, 'PARTIAL'],
      [0, 'PENDING'],
      [0, 'PENDING'],
      [0, 'PENDING'],
    ]);
  });

  it('un pago reversado no se imputa a ninguna cuota', async () => {
    const reversed: CollectionVisitRecord = {
      ...paidVisit('v1', 10_000),
      reversal: PaymentReversal.create({
        id: 'reversal-1',
        paymentId: 'v1-payment',
        reason: 'Monto equivocado.',
        reversedByMembershipId: 'membership-2',
        createdAt: NOW,
      }),
    };
    const { useCase } = setup([reversed]);

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(result.installments.every((row) => row.paidAmount === 0)).toBe(true);
  });

  it('en un préstamo cerrado no marca mora', async () => {
    const { useCase } = setup([], { ...LOAN, status: 'CANCELED' });

    const result = await useCase.execute('loan-1', 'lender-1');

    expect(result.installments.every((row) => row.status === 'PENDING')).toBe(
      true,
    );
  });
});
