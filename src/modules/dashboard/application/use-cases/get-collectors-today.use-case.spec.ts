import { describe, expect, it, vi } from 'vitest';
import { GetCollectorsTodayUseCase } from '@/modules/dashboard/application/use-cases/get-collectors-today.use-case.js';

const NOW = new Date('2026-10-15T15:00:00Z');
const FIRST = new Date('2026-10-15T13:00:00Z');
const LAST = new Date('2026-10-15T14:30:00Z');

function summary(
  routeLoans: number,
  visitedLoans: number,
  visitTimes: readonly Date[] = [],
) {
  return {
    date: '2026-10-15',
    expectedAmount: 100_000,
    collectedAmount: 40_000,
    collectedByMethod: { CASH: 40_000, NEQUI: 0, TRANSFER: 0 },
    routeLoans,
    visitedLoans,
    visits: visitTimes.map((occurredAt) => ({ occurredAt })),
  };
}

function setup() {
  const byCollector: Record<string, ReturnType<typeof summary>> = {
    ana: summary(4, 0),
    beto: summary(5, 2, [FIRST, LAST]),
    carla: summary(3, 3, [FIRST, LAST]),
    dario: summary(0, 0),
  };
  const names: Record<string, string> = {
    ana: 'Ana',
    beto: 'Beto',
    carla: 'Carla',
    dario: 'Darío',
  };
  const useCase = new GetCollectorsTodayUseCase(
    {
      execute: vi.fn(() =>
        Promise.resolve({
          items: Object.keys(names)
            .toReversed()
            .map((id) => ({ id, fullName: names[id] })),
          total: 4,
        }),
      ),
    } as never,
    {
      execute: vi.fn((input: { collectorMembershipId: string }) =>
        Promise.resolve(byCollector[input.collectorMembershipId]),
      ),
    } as never,
    {
      execute: vi.fn(() =>
        Promise.resolve({
          items: [{ collectorMembershipId: 'carla', status: 'PENDING' }],
          total: 1,
        }),
      ),
    } as never,
    { now: () => NOW },
  );
  return useCase;
}

describe('GetCollectorsTodayUseCase', () => {
  it('cuenta los cobradores por estado de su ruta', async () => {
    const result = await setup().execute('lender-1');

    expect(result.date).toBe('2026-10-15');
    expect(result.counts).toEqual({
      NO_ROUTE: 1,
      NOT_STARTED: 1,
      IN_PROGRESS: 1,
      FINISHED: 1,
    });
  });

  it('lista primero a quien no empezó y al final a quien no tiene ruta', async () => {
    const result = await setup().execute('lender-1');

    expect(result.collectors.map((c) => c.fullName)).toEqual([
      'Ana',
      'Beto',
      'Carla',
      'Darío',
    ]);
  });

  it('dice cuántos préstamos le faltan, cuándo empezó y si envió su cuadre', async () => {
    const result = await setup().execute('lender-1');
    const [ana, beto, carla] = result.collectors;

    expect(ana).toMatchObject({
      pendingLoans: 4,
      firstVisitAt: null,
      lastVisitAt: null,
      settlementStatus: null,
    });
    expect(beto).toMatchObject({
      pendingLoans: 3,
      firstVisitAt: FIRST,
      lastVisitAt: LAST,
      expectedAmount: 100_000,
      collectedAmount: 40_000,
    });
    expect(carla).toMatchObject({
      pendingLoans: 0,
      settlementStatus: 'PENDING',
    });
  });
});
