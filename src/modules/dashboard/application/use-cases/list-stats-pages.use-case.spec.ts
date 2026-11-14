import { describe, expect, it, vi } from 'vitest';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import type { LenderStatsScope } from '@/modules/dashboard/application/services/lender-stats-scope.js';
import type {
  LoanPortfolioSnapshotService,
  LoanStatsRecord,
} from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import { ListCollectorPerformanceUseCase } from '@/modules/dashboard/application/use-cases/list-collector-performance.use-case.js';
import { ListTopArrearsUseCase } from '@/modules/dashboard/application/use-cases/list-top-arrears.use-case.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';

const NOW = new Date('2026-10-09T15:00:00Z'); // 2026-10-09 en Bogotá
const clock = { now: () => NOW };

const collector = (id: string, portfolioId: string) =>
  ({ id, portfolioId, fullName: `Cobrador ${id}` }) as MembershipListEntry;

const COLLECTORS = [
  collector('m1', 'portfolio-a'),
  collector('m2', 'portfolio-b'),
  collector('m3', 'portfolio-a'),
];

const overdue = (
  clientId: string,
  overdueDays: number,
  collectorMembershipId = 'm1',
): LoanStatsRecord => ({
  clientId,
  balance: 100_000,
  overdueAmount: 10_000 * overdueDays,
  overdueDays,
  collectorMembershipId,
});

function setup(records: LoanStatsRecord[]) {
  const withClientNames = vi.fn((ranked: { clientId: string }[]) =>
    Promise.resolve(
      ranked.map((entry) => ({ ...entry, clientFullName: entry.clientId })),
    ),
  );
  const collectorStats = vi.fn((list: MembershipListEntry[]) =>
    Promise.resolve(
      list.map(
        () =>
          ({ effectiveness: 0.5, overdueAmount: 7 }) as CollectorPeriodStats,
      ),
    ),
  );
  const scope = {
    activeCollectors: () => Promise.resolve(COLLECTORS),
    withClientNames,
    collectorStats,
  } as unknown as LenderStatsScope;
  const snapshots = {
    current: vi.fn(() => Promise.resolve(records)),
  } as unknown as LoanPortfolioSnapshotService;
  return {
    topArrears: new ListTopArrearsUseCase(snapshots, scope, clock),
    performance: new ListCollectorPerformanceUseCase(scope, clock),
    withClientNames,
    collectorStats,
  };
}

describe('ListTopArrearsUseCase', () => {
  it('pagina el ranking completo y busca nombres solo de la página', async () => {
    const { topArrears, withClientNames } = setup([
      overdue('c1', 1),
      overdue('c2', 9),
      overdue('c3', 5),
      { ...overdue('c4', 0), overdueAmount: 0 },
    ]);

    const page = await topArrears.execute({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 2,
    });

    expect(page.total).toBe(3);
    expect(page.items.map((entry) => entry.clientId)).toEqual(['c1']);
    expect(withClientNames).toHaveBeenCalledOnce();
  });

  it('aplica el filtro de cartera', async () => {
    const { topArrears } = setup([
      overdue('c1', 3, 'm1'),
      overdue('c2', 4, 'm2'),
    ]);

    const page = await topArrears.execute({
      lenderId: 'lender-1',
      portfolioId: 'portfolio-b',
      page: 1,
      pageSize: 10,
    });

    expect(page.items.map((entry) => entry.clientId)).toEqual(['c2']);
  });
});

describe('ListCollectorPerformanceUseCase', () => {
  it('calcula las métricas solo de los cobradores de la página, del mes actual', async () => {
    const { performance, collectorStats } = setup([]);

    const page = await performance.execute({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 2,
    });

    expect(page.total).toBe(3);
    expect(page.items).toEqual([
      {
        collectorMembershipId: 'm3',
        fullName: 'Cobrador m3',
        effectiveness: 0.5,
        overdueAmount: 7,
      },
    ]);
    expect(collectorStats).toHaveBeenCalledExactlyOnceWith(
      [COLLECTORS[2]],
      'lender-1',
      { from: '2026-10-01', to: '2026-10-09' },
    );
  });

  it('respeta el período y la cartera pedidos', async () => {
    const { performance, collectorStats } = setup([]);

    const page = await performance.execute({
      lenderId: 'lender-1',
      from: '2026-09-01',
      to: '2026-09-30',
      portfolioId: 'portfolio-a',
      page: 1,
      pageSize: 10,
    });

    expect(page.total).toBe(2);
    expect(collectorStats).toHaveBeenCalledWith(
      [COLLECTORS[0], COLLECTORS[2]],
      'lender-1',
      { from: '2026-09-01', to: '2026-09-30' },
    );
  });
});
