import { describe, expect, it } from 'vitest';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import { renderLenderStatsPdf } from '@/modules/dashboard/infrastructure/pdf/lender-stats-pdf.js';

const EMPTY_STATS: LenderPeriodStats = {
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
  expectedAmount: 0,
  collectedAmount: 0,
  effectiveness: null,
  previous: null,
};

describe('renderLenderStatsPdf', () => {
  it('genera un PDF válido, incluso sin mora ni cobradores', async () => {
    const buffer = await renderLenderStatsPdf(EMPTY_STATS, 'Créditos Ana');

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('genera un PDF válido con mora, ranking y desempeño poblados', async () => {
    const stats: LenderPeriodStats = {
      ...EMPTY_STATS,
      totalPortfolio: 1_000_000,
      portfolioAtRisk: 100_000,
      arrearsRate: 0.1,
      arrearsByAge: [
        { label: '0-7', amount: 100_000, clientsCount: 1 },
        { label: '8-15', amount: 0, clientsCount: 0 },
        { label: '16-30', amount: 0, clientsCount: 0 },
        { label: '30+', amount: 0, clientsCount: 0 },
      ],
      topArrears: [
        {
          clientId: 'client-1',
          clientFullName: 'Mauricio Peña',
          overdueDays: 5,
          overdueAmount: 100_000,
        },
      ],
      collectorPerformance: [
        {
          collectorMembershipId: 'membership-1',
          fullName: 'Carlos Cobrador',
          effectiveness: 0.8,
          overdueAmount: 100_000,
        },
      ],
      expectedAmount: 100_000,
      collectedAmount: 80_000,
      effectiveness: 0.8,
      previous: null,
    };

    const buffer = await renderLenderStatsPdf(stats, 'Créditos Ana');

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
