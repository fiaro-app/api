import { describe, expect, it, vi } from 'vitest';
import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { CollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.dto.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import type { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import type { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-07T15:00:00Z');
const TODAY = '2026-10-07';

function loan(id: string, clientId: string) {
  return { id, clientId } as never;
}

function membership(id: string, portfolioId: string | null, fullName: string) {
  return { id, portfolioId, fullName } as never;
}

function assignment(
  collectorMembershipId: string,
  effectiveFrom: string,
  effectiveTo: string | null = null,
): CollectionAssignmentDetails {
  return {
    id: `assignment-${collectorMembershipId}-${effectiveFrom}`,
    loanId: 'loan-x',
    collectorMembershipId,
    effectiveFrom,
    effectiveTo,
    createdAt: NOW,
  };
}

function balance(
  overdueAmount: number,
  balanceAmount: number,
): LoanBalanceDetails {
  return {
    loanId: 'loan-x',
    asOf: TODAY,
    balance: balanceAmount,
    totalExpectedToDate: 0,
    overdueAmount,
    overdueDays: overdueAmount > 0 ? 10 : 0,
    nextDueDate: null,
    firstOverdueDate: null,
  };
}

function collectorStats(
  overrides: Partial<CollectorPeriodStats> = {},
): CollectorPeriodStats {
  return {
    from: TODAY,
    to: TODAY,
    expectedAmount: 0,
    collectedAmount: 0,
    effectiveness: null,
    visitsCount: 0,
    overdueAmount: 0,
    ...overrides,
  };
}

interface SetupOptions {
  readonly loans?: readonly unknown[];
  readonly collectors?: readonly unknown[];
  readonly balanceByLoan?: Record<string, LoanBalanceDetails>;
  readonly assignmentsByLoan?: Record<
    string,
    readonly CollectionAssignmentDetails[]
  >;
  readonly statsByCollector?: Record<string, CollectorPeriodStats>;
  readonly clientNameById?: Record<string, string>;
}

function setup(options: SetupOptions) {
  const loans = options.loans ?? [];
  const listLoansExecute = vi.fn(() =>
    Promise.resolve({ items: loans, total: loans.length }),
  );
  const listLoans = {
    execute: listLoansExecute,
  } as unknown as ListLoansUseCase;

  const balanceByLoan = options.balanceByLoan ?? {};
  const getLoanBalanceExecute = vi.fn((loanId: string) =>
    Promise.resolve(balanceByLoan[loanId] ?? balance(0, 0)),
  );
  const getLoanBalance = {
    execute: getLoanBalanceExecute,
  } as unknown as GetLoanBalanceUseCase;

  const assignmentsByLoan = options.assignmentsByLoan ?? {};
  const listCollectionAssignmentsExecute = vi.fn((loanId: string) =>
    Promise.resolve(assignmentsByLoan[loanId] ?? []),
  );
  const listCollectionAssignments = {
    execute: listCollectionAssignmentsExecute,
  } as unknown as ListCollectionAssignmentsUseCase;

  const collectors = options.collectors ?? [];
  const listMembershipsExecute = vi.fn(() =>
    Promise.resolve({ items: collectors, total: collectors.length }),
  );
  const listMemberships = {
    execute: listMembershipsExecute,
  } as unknown as ListMembershipsUseCase;

  const statsByCollector = options.statsByCollector ?? {};
  const getCollectorStatsExecute = vi.fn(
    (input: { collectorMembershipId: string }) =>
      Promise.resolve(
        statsByCollector[input.collectorMembershipId] ?? collectorStats(),
      ),
  );
  const getCollectorStats = {
    execute: getCollectorStatsExecute,
  } as unknown as GetCollectorStatsUseCase;

  const clientNameById = options.clientNameById ?? {};
  const getClientExecute = vi.fn((clientId: string) =>
    Promise.resolve({
      fullName: clientNameById[clientId] ?? 'Sin nombre',
    } as ClientDetails),
  );
  const getClient = {
    execute: getClientExecute,
  } as unknown as GetClientUseCase;

  const clock: Clock = { now: () => NOW };
  const useCase = new GetLenderStatsUseCase(
    listLoans,
    getLoanBalance,
    listCollectionAssignments,
    listMemberships,
    getCollectorStats,
    getClient,
    clock,
  );
  return { useCase, getCollectorStatsExecute, getClientExecute };
}

describe('GetLenderStatsUseCase', () => {
  it('sin préstamos ni cobradores, todo sale en cero, null o vacío, con el mes actual por defecto', async () => {
    const { useCase } = setup({});

    const result = await useCase.execute({ lenderId: 'lender-1' });

    expect(result).toEqual({
      from: '2026-10-01',
      to: TODAY,
      totalPortfolio: 0,
      portfolioAtRisk: 0,
      arrearsRate: null,
      arrearsByAge: [
        { label: '0-7', amount: 0, clientsCount: 0 },
        { label: '8-15', amount: 0, clientsCount: 0 },
        { label: '16-30', amount: 0, clientsCount: 0 },
        { label: '30+', amount: 0, clientsCount: 0 },
      ],
      topArrears: [],
      collectorPerformance: [],
    });
  });

  it('con from/to explícitos, los usa en vez del mes actual', async () => {
    const { useCase } = setup({});

    const result = await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-09-01',
      to: '2026-09-30',
    });

    expect(result.from).toBe('2026-09-01');
    expect(result.to).toBe('2026-09-30');
  });

  it('suma el saldo de los préstamos activos como cartera total, sin filtros', async () => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1'), loan('loan-2', 'client-2')],
      balanceByLoan: {
        'loan-1': balance(0, 100_000),
        'loan-2': balance(0, 50_000),
      },
    });

    const result = await useCase.execute({ lenderId: 'lender-1' });

    expect(result.totalPortfolio).toBe(150_000);
    expect(result.portfolioAtRisk).toBe(0);
    expect(result.arrearsRate).toBe(0);
  });

  it('cuenta como cartera en riesgo solo lo que tiene algo vencido, y calcula arrearsRate', async () => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1'), loan('loan-2', 'client-2')],
      balanceByLoan: {
        'loan-1': balance(10_000, 40_000),
        'loan-2': balance(0, 60_000),
      },
    });

    const result = await useCase.execute({ lenderId: 'lender-1' });

    expect(result.totalPortfolio).toBe(100_000);
    expect(result.portfolioAtRisk).toBe(40_000);
    expect(result.arrearsRate).toBeCloseTo(0.4);
  });

  it('agrupa la mora por antigüedad y arma el ranking con el nombre del cliente', async () => {
    const { useCase, getClientExecute } = setup({
      loans: [loan('loan-1', 'client-1')],
      balanceByLoan: { 'loan-1': balance(10_000, 40_000) },
      clientNameById: { 'client-1': 'Mauricio Peña' },
    });

    const result = await useCase.execute({ lenderId: 'lender-1' });

    expect(result.arrearsByAge.find((b) => b.label === '8-15')).toEqual({
      label: '8-15',
      amount: 40_000,
      clientsCount: 1,
    });
    expect(result.topArrears).toEqual([
      {
        clientId: 'client-1',
        clientFullName: 'Mauricio Peña',
        overdueDays: 10,
        overdueAmount: 10_000,
      },
    ]);
    expect(getClientExecute).toHaveBeenCalledExactlyOnceWith(
      'client-1',
      'lender-1',
    );
  });

  it('filtra por collectorMembershipId: solo sus préstamos y solo él en el desempeño', async () => {
    const { useCase, getCollectorStatsExecute } = setup({
      loans: [loan('loan-1', 'client-1'), loan('loan-2', 'client-2')],
      balanceByLoan: {
        'loan-1': balance(0, 100_000),
        'loan-2': balance(0, 200_000),
      },
      assignmentsByLoan: {
        'loan-1': [assignment('m1', TODAY)],
        'loan-2': [assignment('m2', TODAY)],
      },
      collectors: [
        membership('m1', null, 'Cobrador Uno'),
        membership('m2', null, 'Cobrador Dos'),
      ],
    });

    const result = await useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'm1',
    });

    expect(result.totalPortfolio).toBe(100_000);
    expect(result.collectorPerformance).toEqual([
      {
        collectorMembershipId: 'm1',
        fullName: 'Cobrador Uno',
        effectiveness: null,
        overdueAmount: 0,
      },
    ]);
    expect(getCollectorStatsExecute).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ collectorMembershipId: 'm1' }),
    );
  });

  it('filtra por portfolioId: solo los cobradores de esa cartera y sus préstamos', async () => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1'), loan('loan-2', 'client-2')],
      balanceByLoan: {
        'loan-1': balance(0, 100_000),
        'loan-2': balance(0, 200_000),
      },
      assignmentsByLoan: {
        'loan-1': [assignment('m1', TODAY)],
        'loan-2': [assignment('m2', TODAY)],
      },
      collectors: [
        membership('m1', 'portfolio-a', 'Cobrador Uno'),
        membership('m2', 'portfolio-b', 'Cobrador Dos'),
      ],
    });

    const result = await useCase.execute({
      lenderId: 'lender-1',
      portfolioId: 'portfolio-a',
    });

    expect(result.totalPortfolio).toBe(100_000);
    expect(
      result.collectorPerformance.map((c) => c.collectorMembershipId),
    ).toEqual(['m1']);
  });

  it('un préstamo sin asignación vigente hoy cuenta en la cartera total sin filtros, pero no al filtrar', async () => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1'), loan('loan-2', 'client-2')],
      balanceByLoan: {
        'loan-1': balance(0, 100_000),
        'loan-2': balance(0, 200_000),
      },
      assignmentsByLoan: {
        'loan-1': [assignment('m1', TODAY)],
        // loan-2 sin ninguna asignación: sin cobrador hoy.
      },
      collectors: [membership('m1', 'portfolio-a', 'Cobrador Uno')],
    });

    const sinFiltro = await useCase.execute({ lenderId: 'lender-1' });
    expect(sinFiltro.totalPortfolio).toBe(300_000);

    const conFiltro = await useCase.execute({
      lenderId: 'lender-1',
      portfolioId: 'portfolio-a',
    });
    expect(conFiltro.totalPortfolio).toBe(100_000);
  });

  it('un préstamo asignado a un cobrador que ya no está activo no resuelve cartera', async () => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1')],
      balanceByLoan: { 'loan-1': balance(0, 100_000) },
      assignmentsByLoan: { 'loan-1': [assignment('m-inactivo', TODAY)] },
      collectors: [],
    });

    const result = await useCase.execute({
      lenderId: 'lender-1',
      portfolioId: 'portfolio-a',
    });

    expect(result.totalPortfolio).toBe(0);
  });

  it.each([
    [
      'vigente desde hoy, sin fecha de fin',
      assignment('m1', TODAY, null),
      true,
    ],
    ['empieza en el futuro', assignment('m1', '2026-10-08', null), false],
    ['ya terminó', assignment('m1', '2026-09-01', '2026-10-06'), false],
    [
      'termina en el futuro',
      assignment('m1', '2026-09-01', '2026-10-08'),
      true,
    ],
  ])('asignación %s', async (_label, loanAssignment, shouldMatch) => {
    const { useCase } = setup({
      loans: [loan('loan-1', 'client-1')],
      balanceByLoan: { 'loan-1': balance(0, 100_000) },
      assignmentsByLoan: { 'loan-1': [loanAssignment] },
      collectors: [membership('m1', null, 'Cobrador Uno')],
    });

    const result = await useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'm1',
    });

    expect(result.totalPortfolio).toBe(shouldMatch ? 100_000 : 0);
  });
});
