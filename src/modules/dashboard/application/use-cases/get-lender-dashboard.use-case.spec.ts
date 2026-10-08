import { describe, expect, it, vi } from 'vitest';
import type { CollectorDailySummary } from '@/modules/collections/application/dtos/collector-daily-summary.dto.js';
import type { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import type { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-07T15:00:00Z');
const TODAY = '2026-10-07';

function membership(id: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') {
  return { id, status } as never;
}

function loan(id: string, clientId: string) {
  return { id, clientId } as never;
}

function summary(
  overrides: Partial<CollectorDailySummary> = {},
): CollectorDailySummary {
  return {
    date: TODAY,
    expectedAmount: 0,
    collectedAmount: 0,
    collectedByMethod: { CASH: 0, NEQUI: 0, TRANSFER: 0 },
    visits: [],
    ...overrides,
  };
}

function balance(overdueAmount: number, balanceAmount = 0): LoanBalanceDetails {
  return {
    loanId: 'loan-x',
    asOf: TODAY,
    balance: balanceAmount,
    totalExpectedToDate: 0,
    overdueAmount,
    overdueDays: overdueAmount > 0 ? 5 : 0,
    nextDueDate: null,
    firstOverdueDate: null,
  };
}

function settlement(
  overrides: Partial<SettlementDetails> = {},
): SettlementDetails {
  return {
    id: 'settlement-1',
    collectorMembershipId: 'membership-1',
    date: TODAY,
    expectedAmount: 50_000,
    collectedAmount: 50_000,
    collectedCash: 50_000,
    collectedNequi: 0,
    collectedTransfer: 0,
    status: 'PENDING',
    collectorNote: null,
    reviewNote: null,
    reviewedByMembershipId: null,
    reviewedAt: null,
    submittedAt: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

function setup(options: {
  readonly memberships?: readonly unknown[];
  readonly loans?: readonly unknown[];
  readonly balanceByLoan?: Record<string, LoanBalanceDetails>;
  readonly summaryByCollector?: Record<string, CollectorDailySummary>;
  readonly settlements?: readonly SettlementDetails[];
}) {
  const memberships = options.memberships ?? [];
  const activeCollectors = memberships.filter(
    (m) => (m as { status: string }).status === 'ACTIVE',
  );
  const listMembershipsExecute = vi.fn((input: { status?: string }) =>
    Promise.resolve({
      items: input.status === 'ACTIVE' ? activeCollectors : memberships,
      total:
        input.status === 'ACTIVE'
          ? activeCollectors.length
          : memberships.length,
    }),
  );
  const listMemberships = {
    execute: listMembershipsExecute,
  } as unknown as ListMembershipsUseCase;

  const summaryByCollector = options.summaryByCollector ?? {};
  const getCollectorDailySummaryExecute = vi.fn(
    (input: { collectorMembershipId: string }) =>
      Promise.resolve(
        summaryByCollector[input.collectorMembershipId] ?? summary(),
      ),
  );
  const getCollectorDailySummary = {
    execute: getCollectorDailySummaryExecute,
  } as unknown as GetCollectorDailySummaryUseCase;

  const loans = options.loans ?? [];
  const listLoansExecute = vi.fn(() =>
    Promise.resolve({ items: loans, total: loans.length }),
  );
  const listLoans = {
    execute: listLoansExecute,
  } as unknown as ListLoansUseCase;

  const balanceByLoan = options.balanceByLoan ?? {};
  const getLoanBalanceExecute = vi.fn((loanId: string) =>
    Promise.resolve(balanceByLoan[loanId] ?? balance(0)),
  );
  const getLoanBalance = {
    execute: getLoanBalanceExecute,
  } as unknown as GetLoanBalanceUseCase;

  const settlements = options.settlements ?? [];
  const listSettlementsExecute = vi.fn(() =>
    Promise.resolve({ items: settlements, total: settlements.length }),
  );
  const listSettlements = {
    execute: listSettlementsExecute,
  } as unknown as ListSettlementsUseCase;

  const clock: Clock = { now: () => NOW };
  const useCase = new GetLenderDashboardUseCase(
    listMemberships,
    getCollectorDailySummary,
    listLoans,
    getLoanBalance,
    listSettlements,
    clock,
  );
  return { useCase, getCollectorDailySummaryExecute, getLoanBalanceExecute };
}

describe('GetLenderDashboardUseCase', () => {
  it('sin cobradores, préstamos ni cuadres, todo sale en cero o vacío', async () => {
    const { useCase } = setup({});

    const result = await useCase.execute('lender-1');

    expect(result).toEqual({
      totalPortfolio: 0,
      collectedToday: 0,
      activeCollectors: 0,
      totalCollectors: 0,
      effectivenessToday: null,
      clientsInArrears: 0,
      alerts: [],
      pendingSettlements: [],
    });
  });

  it('cuenta cobradores activos y totales por separado', async () => {
    const { useCase } = setup({
      memberships: [membership('m1', 'ACTIVE'), membership('m2', 'INACTIVE')],
    });

    const result = await useCase.execute('lender-1');

    expect(result.activeCollectors).toBe(1);
    expect(result.totalCollectors).toBe(2);
  });

  it('suma lo cobrado y lo esperado hoy entre los cobradores activos', async () => {
    const { useCase } = setup({
      memberships: [membership('m1'), membership('m2')],
      summaryByCollector: {
        m1: summary({ collectedAmount: 20_000, expectedAmount: 40_000 }),
        m2: summary({ collectedAmount: 10_000, expectedAmount: 10_000 }),
      },
    });

    const result = await useCase.execute('lender-1');

    expect(result.collectedToday).toBe(30_000);
    expect(result.effectivenessToday).toBeCloseTo(30_000 / 50_000);
  });

  it('suma el saldo de los préstamos activos como cartera total', async () => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1'), loan('loan-2', 'client-2')],
      balanceByLoan: {
        'loan-1': balance(0, 100_000),
        'loan-2': balance(0, 50_000),
      },
    });

    const result = await useCase.execute('lender-1');

    expect(result.totalPortfolio).toBe(150_000);
  });

  it('cuenta clientes distintos en mora, sin repetir si tienen varios préstamos', async () => {
    const { useCase } = setup({
      loans: [
        loan('loan-1', 'client-1'),
        loan('loan-2', 'client-1'),
        loan('loan-3', 'client-2'),
      ],
      balanceByLoan: {
        'loan-1': balance(10_000),
        'loan-2': balance(5_000),
        'loan-3': balance(0),
      },
    });

    const result = await useCase.execute('lender-1');

    expect(result.clientsInArrears).toBe(1);
  });

  it('avisa de cobradores sin ruta iniciada y de cuadres con diferencias', async () => {
    const { useCase } = setup({
      memberships: [membership('m1')],
      summaryByCollector: { m1: summary({ visits: [] }) },
      settlements: [
        settlement({ expectedAmount: 50_000, collectedAmount: 30_000 }),
      ],
    });

    const result = await useCase.execute('lender-1');

    expect(result.alerts).toEqual([
      '1 cobrador aún no ha iniciado su ruta hoy.',
      '1 cuadre tiene diferencias pendientes de revisar.',
    ]);
    expect(result.pendingSettlements).toHaveLength(1);
  });

  it('un cuadre pendiente sin diferencia no dispara su alerta', async () => {
    const { useCase } = setup({
      settlements: [settlement()],
    });

    const result = await useCase.execute('lender-1');

    expect(result.alerts).toEqual([]);
    expect(result.pendingSettlements).toHaveLength(1);
  });
});
