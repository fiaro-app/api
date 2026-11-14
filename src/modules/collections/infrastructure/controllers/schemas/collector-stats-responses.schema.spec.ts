import { describe, expect, it } from 'vitest';
import type { CollectorDailySummary } from '@/modules/collections/application/dtos/collector-daily-summary.dto.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import {
  toCollectorDailySummaryResponse,
  toCollectorPeriodStatsResponse,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-responses.schema.js';

describe('toCollectorDailySummaryResponse', () => {
  it('convierte el resumen, incluyendo sus visitas', () => {
    const summary: CollectorDailySummary = {
      date: '2026-10-07',
      expectedAmount: 50_000,
      collectedAmount: 30_000,
      collectedByMethod: { CASH: 30_000, NEQUI: 0, TRANSFER: 0 },
      routeLoans: 0,
      visitedLoans: 0,
      visits: [],
    };

    expect(toCollectorDailySummaryResponse(summary)).toEqual({
      date: '2026-10-07',
      expectedAmount: 50_000,
      collectedAmount: 30_000,
      collectedByMethod: { CASH: 30_000, NEQUI: 0, TRANSFER: 0 },
      visits: [],
    });
  });
});

describe('toCollectorPeriodStatsResponse', () => {
  it('convierte las métricas del período', () => {
    const stats: CollectorPeriodStats = {
      from: '2026-10-01',
      to: '2026-10-07',
      expectedAmount: 100_000,
      collectedAmount: 80_000,
      effectiveness: 0.8,
      visitsCount: 5,
      overdueAmount: 10_000,
    };

    expect(toCollectorPeriodStatsResponse(stats)).toEqual(stats);
  });

  it('conserva effectiveness en null cuando no había nada esperado', () => {
    const stats: CollectorPeriodStats = {
      from: '2026-10-01',
      to: '2026-10-07',
      expectedAmount: 0,
      collectedAmount: 0,
      effectiveness: null,
      visitsCount: 0,
      overdueAmount: 0,
    };

    expect(toCollectorPeriodStatsResponse(stats).effectiveness).toBeNull();
  });
});
