import { describe, expect, it } from 'vitest';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import { toLenderPeriodStatsResponse } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-responses.schema.js';

describe('toLenderPeriodStatsResponse', () => {
  it('convierte las métricas, incluyendo los buckets, el ranking y el desempeño', () => {
    const stats: LenderPeriodStats = {
      from: '2026-10-01',
      to: '2026-10-07',
      totalPortfolio: 100_000,
      portfolioAtRisk: 40_000,
      arrearsRate: 0.4,
      arrearsByAge: [
        { label: '0-7', amount: 0, clientsCount: 0 },
        { label: '8-15', amount: 40_000, clientsCount: 1 },
        { label: '16-30', amount: 0, clientsCount: 0 },
        { label: '30+', amount: 0, clientsCount: 0 },
      ],
      topArrears: [
        {
          clientId: 'client-1',
          clientFullName: 'Mauricio Peña',
          overdueDays: 10,
          overdueAmount: 40_000,
        },
      ],
      collectorPerformance: [
        {
          collectorMembershipId: 'membership-1',
          fullName: 'Carlos Cobrador',
          effectiveness: 0.8,
          overdueAmount: 40_000,
        },
      ],
    };

    expect(toLenderPeriodStatsResponse(stats)).toEqual(stats);
  });

  it('sin mora ni cobradores, arrays vacíos y arrearsRate null', () => {
    const stats: LenderPeriodStats = {
      from: '2026-10-01',
      to: '2026-10-07',
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
    };

    const response = toLenderPeriodStatsResponse(stats);
    expect(response.arrearsRate).toBeNull();
    expect(response.topArrears).toEqual([]);
    expect(response.collectorPerformance).toEqual([]);
  });
});
