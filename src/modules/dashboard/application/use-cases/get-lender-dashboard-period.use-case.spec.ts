import { describe, expect, it, vi } from 'vitest';
import type { CollectorDailySummary } from '@/modules/collections/application/dtos/collector-daily-summary.dto.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import type { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import type { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import { batchedBalances } from '@/modules/dashboard/application/use-cases/__fixtures__/batched-balances.js';
import { LoanPortfolioSnapshotService } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import type { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-09T15:00:00Z');
const TODAY = '2026-10-09';

function setup() {
  const collectors = [
    { id: 'm1', status: 'ACTIVE' },
    { id: 'm2', status: 'ACTIVE' },
  ];
  const listMemberships = {
    execute: vi.fn(() =>
      Promise.resolve({ items: collectors, total: collectors.length }),
    ),
  } as unknown as ListMembershipsUseCase;
  const dailySummary = vi.fn((input: { collectorMembershipId: string }) =>
    Promise.resolve({
      date: TODAY,
      expectedAmount: 100,
      collectedAmount: input.collectorMembershipId === 'm1' ? 80 : 50,
      collectedByMethod: { CASH: 0, NEQUI: 0, TRANSFER: 0 },
      visits: [],
    } satisfies CollectorDailySummary),
  );
  const stats = vi.fn((input: { collectorMembershipId: string }) =>
    Promise.resolve({
      expectedAmount: 1_000,
      collectedAmount: input.collectorMembershipId === 'm1' ? 900 : 600,
    } as CollectorPeriodStats),
  );
  const empty = {
    execute: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
  };
  const clock: Clock = { now: () => NOW };
  const useCase = new GetLenderDashboardUseCase(
    listMemberships,
    { execute: dailySummary } as unknown as GetCollectorDailySummaryUseCase,
    { execute: stats } as unknown as GetCollectorStatsUseCase,
    new LoanPortfolioSnapshotService(
      empty as unknown as ListLoansUseCase,
      batchedBalances(
        { execute: vi.fn() } as unknown as GetLoanBalanceUseCase,
        {
          execute: () => Promise.resolve([]),
        } as unknown as ListCollectionAssignmentsUseCase,
      ),
    ),
    empty as unknown as ListSettlementsUseCase,
    clock,
  );
  return { useCase, stats };
}

describe('GetLenderDashboardUseCase con período', () => {
  it('sin período, las cifras del período son las de hoy y no consulta estadísticas', async () => {
    const { useCase, stats } = setup();

    const result = await useCase.execute('lender-1');

    expect(result).toMatchObject({
      period: { from: TODAY, to: TODAY },
      collectedInPeriod: 130,
      expectedInPeriod: 200,
      effectivenessInPeriod: 0.65,
      collectedToday: 130,
    });
    expect(stats).not.toHaveBeenCalled();
  });

  it('con un rango, suma lo cobrado y lo esperado de esos días y deja lo de hoy como está', async () => {
    const { useCase, stats } = setup();

    const result = await useCase.execute('lender-1', {
      from: '2026-10-01',
      to: '2026-10-09',
    });

    expect(stats).toHaveBeenCalledWith({
      collectorMembershipId: 'm1',
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-09',
    });
    expect(result).toMatchObject({
      period: { from: '2026-10-01', to: '2026-10-09' },
      collectedInPeriod: 1_500,
      expectedInPeriod: 2_000,
      effectivenessInPeriod: 0.75,
      collectedToday: 130,
      effectivenessToday: 0.65,
    });
  });

  it('con solo from, el período llega hasta hoy', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('lender-1', { from: '2026-10-05' });

    expect(result.period).toEqual({ from: '2026-10-05', to: TODAY });
  });

  it('con solo to, el período empieza hoy', async () => {
    const { useCase } = setup();

    const result = await useCase.execute('lender-1', { to: TODAY });

    expect(result.period).toEqual({ from: TODAY, to: TODAY });
  });
});
