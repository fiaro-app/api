import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { LenderInsightsController } from '@/modules/dashboard/infrastructure/controllers/lender-insights.controller.js';
import {
  GetLenderInsightsRequestSchema,
  toLenderInsightsResponse,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-insights-schemas.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const INSIGHTS = {
  from: '2026-10-01',
  to: '2026-10-02',
  daily: [{ date: '2026-10-01', expected: 10, collected: 5 }],
  income: {
    collected: 5,
    byMethod: { CASH: 5, NEQUI: 0, TRANSFER: 0 },
    interest: 1,
    principalRecovered: 4,
    interestShare: 0.2,
  },
  origination: {
    loansCreated: 1,
    amountLent: 100,
    averageTicket: 100,
    agreedInterest: 20,
  },
  visits: {
    PAID: 1,
    NOT_FOUND: 0,
    REFUSED: 0,
    RESCHEDULED: 0,
    total: 1,
    contactRate: 1,
    paidRate: 1,
  },
  settlements: {
    submitted: 0,
    balanced: 0,
    withDifference: 0,
    shortfall: 0,
    surplus: 0,
  },
  forecast: [{ date: '2026-10-03', expected: 7 }],
  previous: {
    from: '2026-09-29',
    to: '2026-09-30',
    collected: 3,
    interest: 1,
    loansCreated: 0,
    amountLent: 0,
  },
};

function setup() {
  const execute = vi.fn(() => Promise.resolve(INSIGHTS));
  const cache = {
    getOrLoad: vi.fn(
      (_l: string, _k: string, _t: number, load: () => unknown) => load(),
    ),
  };
  return {
    controller: new LenderInsightsController(
      { execute } as never,
      cache as never,
    ),
    execute,
    cache,
  };
}

const scope = (roles: string[]): LenderScope => ({
  membershipId: 'm1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderInsightsController', () => {
  it('pasa el período al caso de uso, por la caché del prestamista', async () => {
    const { controller, execute, cache } = setup();

    const response = await controller.getInsights(
      { dateRange: { from: '2026-10-01', to: '2026-10-02' } },
      scope(['OWNER']),
    );

    expect(execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      from: '2026-10-01',
      to: '2026-10-02',
    });
    expect(cache.getOrLoad).toHaveBeenCalledWith(
      'lender-1',
      expect.any(String),
      expect.any(Number),
      expect.any(Function),
    );
    expect(response.income.principalRecovered).toBe(4);
  });

  it('sin período usa los valores por defecto del caso de uso', async () => {
    const { controller, execute } = setup();

    await controller.getInsights({}, scope(['LENDER']));

    expect(execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      from: undefined,
      to: undefined,
    });
  });

  it('un cobrador que no administra recibe 403', async () => {
    const { controller, execute } = setup();

    await expect(
      controller.getInsights({}, scope(['COLLECTOR'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('schemas de las estadísticas', () => {
  it('la petición rechaza campos que no declara y un rango al revés', () => {
    expect(GetLenderInsightsRequestSchema.safeParse({ extra: 1 }).success).toBe(
      false,
    );
    expect(
      GetLenderInsightsRequestSchema.safeParse({
        dateRange: { from: '2026-10-05', to: '2026-10-01' },
      }).success,
    ).toBe(false);
    expect(GetLenderInsightsRequestSchema.safeParse({}).success).toBe(true);
  });

  it('la respuesta copia cada sección tal cual', () => {
    expect(toLenderInsightsResponse(INSIGHTS)).toEqual(INSIGHTS);
  });
});
