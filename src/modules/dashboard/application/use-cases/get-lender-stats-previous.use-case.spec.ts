import { describe, expect, it, vi } from 'vitest';
import { LenderStatsScope } from '@/modules/dashboard/application/services/lender-stats-scope.js';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import type { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import type {
  LoanPortfolioSnapshotService,
  LoanStatsRecord,
} from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import type { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-09T15:00:00Z'); // 2026-10-09 en Bogotá

const record = (
  collectorMembershipId: string | null,
  balance: number,
  overdueAmount: number,
): LoanStatsRecord => ({
  clientId: `client-${String(balance)}`,
  balance,
  overdueAmount,
  overdueDays: overdueAmount > 0 ? 3 : 0,
  collectorMembershipId,
});

const statsOf = (
  expectedAmount: number,
  collectedAmount: number,
): CollectorPeriodStats => ({
  from: '',
  to: '',
  expectedAmount,
  collectedAmount,
  effectiveness: expectedAmount === 0 ? null : collectedAmount / expectedAmount,
  visitsCount: 0,
  overdueAmount: 0,
});

function setup() {
  const current = vi.fn(() =>
    Promise.resolve([record('m1', 100_000, 0), record('m2', 200_000, 50_000)]),
  );
  const asOf = vi.fn(() =>
    Promise.resolve([
      record('m1', 80_000, 0),
      record('m2', 120_000, 40_000),
      record(null, 50_000, 10_000),
    ]),
  );
  const snapshots = {
    current,
    asOf,
  } as unknown as LoanPortfolioSnapshotService;
  const collectors = [
    { id: 'm1', portfolioId: 'portfolio-a', fullName: 'Cobrador Uno' },
    { id: 'm2', portfolioId: 'portfolio-b', fullName: 'Cobrador Dos' },
  ];
  const listMemberships = {
    execute: vi.fn(() =>
      Promise.resolve({ items: collectors, total: collectors.length }),
    ),
  } as unknown as ListMembershipsUseCase;
  const getCollectorStats = vi.fn(
    (input: { collectorMembershipId: string; from: string }) => {
      const isPrevious = input.from < '2026-10-01';
      if (isPrevious) {
        return Promise.resolve(
          input.collectorMembershipId === 'm1'
            ? statsOf(100, 70)
            : statsOf(100, 50),
        );
      }
      return Promise.resolve(
        input.collectorMembershipId === 'm1'
          ? statsOf(100, 90)
          : statsOf(100, 60),
      );
    },
  );
  const getClient = {
    execute: vi.fn(() => Promise.resolve({ fullName: 'Cliente' })),
  } as unknown as GetClientUseCase;
  const clock: Clock = { now: () => NOW };
  const useCase = new GetLenderStatsUseCase(
    snapshots,
    new LenderStatsScope(
      listMemberships,
      { execute: getCollectorStats } as unknown as GetCollectorStatsUseCase,
      getClient,
    ),
    clock,
  );
  return { useCase, current, asOf, getCollectorStats };
}

describe('GetLenderStatsUseCase con includePrevious', () => {
  it('suma lo esperado y lo cobrado del período y calcula la efectividad total', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ lenderId: 'lender-1' });

    expect(result).toMatchObject({
      expectedAmount: 200,
      collectedAmount: 150,
      effectiveness: 0.75,
      previous: null,
    });
  });

  it('con includePrevious mide el período anterior de la misma duración, con la cartera a su cierre', async () => {
    const { useCase, asOf, getCollectorStats } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-09',
      includePrevious: true,
    });

    expect(asOf).toHaveBeenCalledExactlyOnceWith('lender-1', '2026-09-30');
    expect(getCollectorStats).toHaveBeenCalledWith(
      expect.objectContaining({
        collectorMembershipId: 'm1',
        from: '2026-09-22',
        to: '2026-09-30',
      }),
    );
    expect(result.previous).toEqual({
      from: '2026-09-22',
      to: '2026-09-30',
      totalPortfolio: 250_000,
      portfolioAtRisk: 170_000,
      arrearsRate: 0.68,
      expectedAmount: 200,
      collectedAmount: 120,
      effectiveness: 0.6,
    });
  });

  it('los filtros también acotan el período anterior', async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-09',
      collectorMembershipId: 'm2',
      includePrevious: true,
    });

    expect(result.previous).toMatchObject({
      totalPortfolio: 120_000,
      portfolioAtRisk: 120_000,
      expectedAmount: 100,
      collectedAmount: 50,
    });
    expect(result.expectedAmount).toBe(100);
    expect(result.collectedAmount).toBe(60);
  });

  it('un mes completo se compara con los mismos días justo antes', async () => {
    const { useCase, asOf } = setup();

    const result = await useCase.execute({
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-31',
      includePrevious: true,
    });

    expect(asOf).toHaveBeenCalledWith('lender-1', '2026-09-30');
    expect(result.previous?.from).toBe('2026-08-31');
  });

  it('sin includePrevious no calcula el período anterior', async () => {
    const { useCase, asOf } = setup();

    await useCase.execute({ lenderId: 'lender-1', includePrevious: false });

    expect(asOf).not.toHaveBeenCalled();
  });
});
