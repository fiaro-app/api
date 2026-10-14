import { describe, expect, it, vi } from 'vitest';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-07T15:00:00Z');
const TODAY = '2026-10-07';
const CREATED_AT = new Date('2026-09-01T00:00:00Z');

const LENDER: LenderDetails = {
  id: 'lender-1',
  tenantId: 'tenant-1',
  name: 'Créditos de prueba',
  logoUrl: null,
  brandColor: null,
  nonWorkingWeekdays: [],
  skipNationalHolidays: false,
  createdAt: CREATED_AT,
};

function loan(id: string, overrides: Partial<LoanDetails> = {}): LoanDetails {
  return {
    id,
    clientId: 'client-1',
    principalAmount: 500_000,
    installmentCount: 20,
    installmentValue: 10_000,
    totalPayable: 200_000,
    frequency: 'DAILY',
    startDate: '2026-10-01',
    status: 'ACTIVE',
    createdByMembershipId: 'membership-admin',
    createdAt: CREATED_AT,
    closedAt: null,
    ...overrides,
  };
}

function assignment(loanId: string): CollectionAssignment {
  return CollectionAssignment.create({
    id: `assignment-${loanId}`,
    loanId,
    collectorMembershipId: 'membership-1',
    effectiveFrom: '2026-09-15',
    effectiveTo: null,
    createdAt: CREATED_AT,
  });
}

function paidVisitRecord(
  loanId: string,
  amount: number,
): CollectionVisitRecord {
  const visit = CollectionVisit.create({
    id: `visit-${loanId}`,
    loanId,
    collectorMembershipId: 'membership-1',
    outcome: 'PAID',
    expectedAmount: amount,
    promisedDate: null,
    occurredAt: NOW,
    createdAt: NOW,
  });
  const payment = Payment.create({
    id: `payment-${loanId}`,
    loanId,
    visitId: `visit-${loanId}`,
    amount,
    method: 'CASH',
    occurredAt: NOW,
    createdAt: NOW,
  });
  return { visit, payment, reversal: null };
}

function setup(options: {
  readonly assigned?: readonly CollectionAssignment[];
  readonly visitRecords?: readonly CollectionVisitRecord[];
  readonly loans?: Record<string, LoanDetails>;
  readonly overdueAmountByLoan?: Record<string, number>;
}) {
  const findActiveByCollectorAndDate = vi.fn(() =>
    Promise.resolve(options.assigned ?? []),
  );
  const assignments: CollectionAssignmentRepository = {
    findActiveByCollectorAndDate,
    listOpenByCollector: vi.fn(() => Promise.resolve([])),
    reassign: vi.fn(() => Promise.resolve()),
    create: vi.fn(),
    findOpenByLoan: vi.fn(),
    listByLoan: vi.fn(),
    update: vi.fn(),
  };
  const listByCollectorAndDateRange = vi.fn(() =>
    Promise.resolve(options.visitRecords ?? []),
  );
  const visits: CollectionVisitRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    listByLoan: vi.fn(),
    listByCollectorAndPromisedDate: vi.fn(),
    listByCollectorAndDateRange,
  };
  const loansById = options.loans ?? {};
  const getLoanExecute = vi.fn((loanId: string) =>
    Promise.resolve(loansById[loanId] ?? loan(loanId)),
  );
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  const getLender = {
    execute: vi.fn(() => Promise.resolve(LENDER)),
  } as unknown as GetLenderUseCase;
  const overdueByLoan = options.overdueAmountByLoan ?? {};
  const getLoanBalance = {
    execute: vi.fn((loanId: string) =>
      Promise.resolve({
        loanId,
        asOf: TODAY,
        balance: 0,
        totalExpectedToDate: 0,
        overdueAmount: overdueByLoan[loanId] ?? 0,
        overdueDays: 0,
        nextDueDate: null,
        firstOverdueDate: null,
      }),
    ),
  } as unknown as GetLoanBalanceUseCase;
  const clock: Clock = { now: () => NOW };
  const useCase = new GetCollectorStatsUseCase(
    assignments,
    visits,
    getLoan,
    getLender,
    getLoanBalance,
    clock,
  );
  return { useCase, findActiveByCollectorAndDate, listByCollectorAndDateRange };
}

describe('GetCollectorStatsUseCase', () => {
  it('sin rango, usa el primer día del mes actual hasta hoy', async () => {
    const {
      useCase,
      findActiveByCollectorAndDate,
      listByCollectorAndDateRange,
    } = setup({});

    await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
    });

    expect(findActiveByCollectorAndDate).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      TODAY,
    );
    expect(listByCollectorAndDateRange).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      '2026-10-01',
      TODAY,
    );
  });

  it('calcula lo esperado del período con el motor de calendario, solo de préstamos activos', async () => {
    const { useCase } = setup({
      assigned: [assignment('loan-1'), assignment('loan-2')],
      loans: {
        'loan-1': loan('loan-1', { startDate: '2026-09-28' }),
        'loan-2': loan('loan-2', {
          startDate: '2026-09-28',
          status: 'CANCELED',
        }),
      },
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-07',
    });

    // DAILY desde 09-28: cuotas en 09-29, 09-30, 10-01 ... 10-07 → 7 caen en el rango.
    expect(result.expectedAmount).toBe(70_000);
  });

  it('calcula la efectividad como cobrado sobre esperado', async () => {
    const { useCase } = setup({
      assigned: [assignment('loan-1')],
      loans: { 'loan-1': loan('loan-1', { startDate: '2026-09-28' }) },
      visitRecords: [paidVisitRecord('loan-1', 20_000)],
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-07',
    });

    expect(result.collectedAmount).toBe(20_000);
    expect(result.expectedAmount).toBe(70_000);
    expect(result.effectiveness).toBeCloseTo(20_000 / 70_000);
    expect(result.visitsCount).toBe(1);
  });

  it('sin nada esperado en el período, la efectividad es null, no 0 ni 1', async () => {
    const { useCase } = setup({});

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-07',
    });

    expect(result.expectedAmount).toBe(0);
    expect(result.effectiveness).toBeNull();
  });

  it('suma la mora de los préstamos activos de su cartera', async () => {
    const { useCase } = setup({
      assigned: [assignment('loan-1'), assignment('loan-2')],
      overdueAmountByLoan: { 'loan-1': 15_000, 'loan-2': 5_000 },
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
    });

    expect(result.overdueAmount).toBe(20_000);
  });
});
