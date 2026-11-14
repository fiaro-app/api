import { describe, expect, it } from 'vitest';
import {
  assembleInsights,
  type InsightsData,
} from '@/modules/dashboard/application/services/assemble-insights.js';

const BASE: InsightsData = {
  period: { from: '2026-10-01', to: '2026-10-02' },
  previous: { from: '2026-09-29', to: '2026-09-30' },
  today: '2026-10-02',
  expected: new Map([['2026-10-01', 100_000]]),
  upcoming: new Map([['2026-10-04', 80_000]]),
  payments: [{ date: '2026-10-01', method: 'CASH', amount: 60_000, count: 3 }],
  income: { collected: 60_000, interest: 15_000 },
  origination: { loansCreated: 2, amountLent: 500_000, totalPayable: 600_000 },
  visits: { PAID: 3, NOT_FOUND: 1, REFUSED: 0, RESCHEDULED: 0 },
  settlements: [{ expectedAmount: 100_000, collectedAmount: 60_000 }],
  before: { collected: 40_000, interest: 8_000 },
  beforeOrigination: {
    loansCreated: 1,
    amountLent: 200_000,
    totalPayable: 240_000,
  },
};

describe('assembleInsights', () => {
  it('parte lo cobrado en capital e interés y calcula la ganancia pactada y el ticket promedio', () => {
    const result = assembleInsights(BASE);

    expect(result.income).toMatchObject({
      collected: 60_000,
      interest: 15_000,
      principalRecovered: 45_000,
      interestShare: 0.25,
    });
    expect(result.income.byMethod).toEqual({
      CASH: 60_000,
      NEQUI: 0,
      TRANSFER: 0,
    });
    expect(result.origination).toEqual({
      loansCreated: 2,
      amountLent: 500_000,
      averageTicket: 250_000,
      agreedInterest: 100_000,
    });
  });

  it('arma la serie diaria, la proyección de 7 días desde mañana y el período anterior', () => {
    const result = assembleInsights(BASE);

    expect(result.daily).toEqual([
      { date: '2026-10-01', expected: 100_000, collected: 60_000 },
      { date: '2026-10-02', expected: 0, collected: 0 },
    ]);
    expect(result.forecast).toHaveLength(7);
    expect(result.forecast[0]).toEqual({ date: '2026-10-03', expected: 0 });
    expect(result.forecast[1]).toEqual({
      date: '2026-10-04',
      expected: 80_000,
    });
    expect(result.previous).toEqual({
      from: '2026-09-29',
      to: '2026-09-30',
      collected: 40_000,
      interest: 8_000,
      loansCreated: 1,
      amountLent: 200_000,
    });
    expect(result.settlements).toMatchObject({
      submitted: 1,
      shortfall: 40_000,
    });
    expect(result.visits.contactRate).toBeCloseTo(0.75);
  });

  it('sin cobros ni préstamos, la proporción de interés y el ticket son null', () => {
    const result = assembleInsights({
      ...BASE,
      income: { collected: 0, interest: 0 },
      origination: { loansCreated: 0, amountLent: 0, totalPayable: 0 },
      payments: [],
    });

    expect(result.income.interestShare).toBeNull();
    expect(result.origination.averageTicket).toBeNull();
  });
});
