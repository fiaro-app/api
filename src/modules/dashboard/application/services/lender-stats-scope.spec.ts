import { describe, expect, it, vi } from 'vitest';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import {
  filterStatsCollectors,
  filterStatsRecords,
  LenderStatsScope,
  toPerformance,
} from '@/modules/dashboard/application/services/lender-stats-scope.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import type { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';

const collector = (id: string, portfolioId: string | null) =>
  ({ id, portfolioId, fullName: `Cobrador ${id}` }) as MembershipListEntry;
const COLLECTORS = [collector('m1', 'a'), collector('m2', 'b')];
const record = (collectorMembershipId: string | null) => ({
  clientId: 'c',
  balance: 1,
  overdueAmount: 0,
  overdueDays: 0,
  collectorMembershipId,
});

describe('filtros de las estadísticas', () => {
  it('acota préstamos por cobrador y por la cartera de su cobrador', () => {
    const records = [record('m1'), record('m2'), record(null), record('mx')];

    expect(filterStatsRecords(records, COLLECTORS, {})).toHaveLength(4);
    expect(
      filterStatsRecords(records, COLLECTORS, { portfolioId: 'b' }).map(
        (r) => r.collectorMembershipId,
      ),
    ).toEqual(['m2']);
    expect(
      filterStatsRecords(records, COLLECTORS, { collectorMembershipId: 'm1' }),
    ).toHaveLength(1);
  });

  it('acota cobradores por id o por cartera', () => {
    expect(filterStatsCollectors(COLLECTORS, {})).toHaveLength(2);
    expect(
      filterStatsCollectors(COLLECTORS, { collectorMembershipId: 'm2' }),
    ).toEqual([COLLECTORS[1]]);
    expect(filterStatsCollectors(COLLECTORS, { portfolioId: 'a' })).toEqual([
      COLLECTORS[0],
    ]);
  });

  it('un cobrador sin métricas sale sin efectividad ni mora', () => {
    expect(toPerformance(collector('m1', 'a'), undefined)).toEqual({
      collectorMembershipId: 'm1',
      fullName: 'Cobrador m1',
      effectiveness: null,
      overdueAmount: 0,
    });
  });
});

describe('LenderStatsScope', () => {
  it('lee los cobradores activos, sus métricas y los nombres del ranking', async () => {
    const listExecute = vi.fn(() =>
      Promise.resolve({ items: COLLECTORS, total: 2 }),
    );
    const statsExecute = vi.fn(() => Promise.resolve({ effectiveness: 1 }));
    const clientExecute = vi.fn(() => Promise.resolve({ fullName: 'Ana' }));
    const scope = new LenderStatsScope(
      { execute: listExecute } as unknown as ListMembershipsUseCase,
      { execute: statsExecute } as unknown as GetCollectorStatsUseCase,
      { execute: clientExecute } as unknown as GetClientUseCase,
    );

    expect(await scope.activeCollectors('lender-1')).toEqual(COLLECTORS);
    expect(listExecute).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'COLLECTOR', status: 'ACTIVE' }),
    );
    await scope.collectorStats(COLLECTORS, 'lender-1', {
      from: '2026-10-01',
      to: '2026-10-09',
    });
    expect(statsExecute).toHaveBeenCalledTimes(2);
    const named = await scope.withClientNames(
      [{ clientId: 'c1', overdueDays: 1, overdueAmount: 2 }],
      'lender-1',
    );
    expect(named).toEqual([
      {
        clientId: 'c1',
        overdueDays: 1,
        overdueAmount: 2,
        clientFullName: 'Ana',
      },
    ]);
  });
});
