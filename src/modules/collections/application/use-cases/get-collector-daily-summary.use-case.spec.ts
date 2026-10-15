import { describe, expect, it, vi } from 'vitest';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
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
    startDate: '2026-10-06',
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
    effectiveFrom: '2026-10-01',
    effectiveTo: null,
    createdAt: CREATED_AT,
  });
}

function paidVisitRecord(
  loanId: string,
  amount: number,
  method: 'CASH' | 'NEQUI' | 'TRANSFER',
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
    method,
    occurredAt: NOW,
    createdAt: NOW,
  });
  return { visit, payment, reversal: null };
}

function setup(options: {
  readonly assigned?: readonly CollectionAssignment[];
  readonly visitRecords?: readonly CollectionVisitRecord[];
  readonly loans?: Record<string, LoanDetails>;
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
    summarizeByCollectorAndDateRange: vi.fn(),
  };
  const loansById = options.loans ?? {};
  const getLoanExecute = vi.fn((loanId: string) =>
    Promise.resolve(loansById[loanId] ?? loan(loanId)),
  );
  const listLoans = {
    execute: vi.fn(
      async (input: { ids: readonly string[]; status?: string }) => {
        const found = await Promise.all(
          input.ids.map((loanId) => getLoanExecute(loanId)),
        );
        const active = found.filter(
          (item) => input.status === undefined || item.status === input.status,
        );
        return { items: active, total: active.length };
      },
    ),
  } as unknown as ListLoansUseCase;
  const getLender = {
    execute: vi.fn(() => Promise.resolve(LENDER)),
  } as unknown as GetLenderUseCase;
  const clock: Clock = { now: () => NOW };
  const useCase = new GetCollectorDailySummaryUseCase(
    assignments,
    visits,
    listLoans,
    getLender,
    {
      listVisitRecordsByLoans: vi.fn(() => Promise.resolve([])),
    } as unknown as LoanPortfolioReadRepository,
    clock,
  );
  return {
    useCase,
    findActiveByCollectorAndDate,
    listByCollectorAndDateRange,
  };
}

describe('GetCollectorDailySummaryUseCase', () => {
  it('usa la fecha de hoy cuando no llega una', async () => {
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
      TODAY,
      TODAY,
    );
  });

  it('calcula lo esperado del día con el motor de calendario, de los préstamos activos asignados', async () => {
    const { useCase } = setup({
      assigned: [assignment('loan-1')],
      loans: { 'loan-1': loan('loan-1', { startDate: '2026-10-06' }) },
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: TODAY,
    });

    // DAILY desde 2026-10-06: la primera cuota cae el 10-07.
    expect(result.expectedAmount).toBe(10_000);
  });

  it('un préstamo ya no ACTIVE no suma a lo esperado', async () => {
    const { useCase } = setup({
      assigned: [assignment('loan-1')],
      loans: {
        'loan-1': loan('loan-1', {
          startDate: '2026-10-06',
          status: 'PAID_OFF',
        }),
      },
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: TODAY,
    });

    expect(result.expectedAmount).toBe(0);
  });

  it('un préstamo que se saldó hoy sigue sumando a lo esperado', async () => {
    const { useCase } = setup({
      assigned: [assignment('loan-1')],
      loans: {
        'loan-1': loan('loan-1', {
          startDate: '2026-10-06',
          status: 'PAID_OFF',
          closedAt: new Date('2026-10-07T20:00:00Z'),
        }),
      },
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: TODAY,
    });

    expect(result.expectedAmount).toBe(10_000);
  });

  it('suma lo cobrado del día, desglosado por medio de pago', async () => {
    const { useCase } = setup({
      visitRecords: [
        paidVisitRecord('loan-1', 20_000, 'CASH'),
        paidVisitRecord('loan-2', 15_000, 'NEQUI'),
      ],
    });

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: TODAY,
    });

    expect(result.collectedAmount).toBe(35_000);
    expect(result.collectedByMethod).toEqual({
      CASH: 20_000,
      NEQUI: 15_000,
      TRANSFER: 0,
    });
    expect(result.visits).toHaveLength(2);
  });

  it('sin asignaciones ni visitas, todo sale en cero', async () => {
    const { useCase } = setup({});

    const result = await useCase.execute({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: TODAY,
    });

    expect(result).toEqual({
      date: TODAY,
      expectedAmount: 0,
      collectedAmount: 0,
      collectedByMethod: { CASH: 0, NEQUI: 0, TRANSFER: 0 },
      visits: [],
    });
  });
});
