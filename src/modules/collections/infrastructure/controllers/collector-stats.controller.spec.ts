import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { GetCollectorDailySummaryUseCase } from '@/modules/collections/application/use-cases/get-collector-daily-summary.use-case.js';
import type { GetCollectorStatsUseCase } from '@/modules/collections/application/use-cases/get-collector-stats.use-case.js';
import { CollectorStatsController } from '@/modules/collections/infrastructure/controllers/collector-stats.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DAILY_SUMMARY = {
  date: '2026-10-07',
  expectedAmount: 50_000,
  collectedAmount: 30_000,
  collectedByMethod: { CASH: 30_000, NEQUI: 0, TRANSFER: 0 },
  visits: [],
};

const PERIOD_STATS = {
  from: '2026-10-01',
  to: '2026-10-07',
  expectedAmount: 100_000,
  collectedAmount: 80_000,
  effectiveness: 0.8,
  visitsCount: 5,
  overdueAmount: 10_000,
};

function setup() {
  const getCollectorDailySummaryUseCase = {
    execute: vi.fn(() => Promise.resolve(DAILY_SUMMARY)),
  };
  const getCollectorStatsUseCase = {
    execute: vi.fn(() => Promise.resolve(PERIOD_STATS)),
  };
  const controller = new CollectorStatsController(
    getCollectorDailySummaryUseCase as unknown as GetCollectorDailySummaryUseCase,
    getCollectorStatsUseCase as unknown as GetCollectorStatsUseCase,
  );
  return {
    controller,
    getCollectorDailySummaryUseCase,
    getCollectorStatsUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('CollectorStatsController', () => {
  it('publica dos QUERY, colgando de collectors/me', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      CollectorStatsController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          CollectorStatsController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['QUERY', 'QUERY']);
    expect(Reflect.getMetadata(PATH_METADATA, CollectorStatsController)).toBe(
      'collectors/me',
    );
  });

  describe('getCollectorDailySummary', () => {
    it('con rol COLLECTOR devuelve el resumen del día', async () => {
      const { controller, getCollectorDailySummaryUseCase } = setup();

      const response = await controller.getCollectorDailySummary(
        { date: '2026-10-07' },
        scopeWith(['COLLECTOR']),
      );

      expect(
        getCollectorDailySummaryUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        collectorMembershipId: 'membership-1',
        lenderId: 'lender-1',
        date: '2026-10-07',
      });
      expect(response.collectedAmount).toBe(30_000);
    });

    it('sin el rol COLLECTOR responde 403 sin consultar nada', async () => {
      const { controller, getCollectorDailySummaryUseCase } = setup();

      const error = await controller
        .getCollectorDailySummary({}, scopeWith(['LENDER']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(getCollectorDailySummaryUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getCollectorStats', () => {
    it('con rol COLLECTOR devuelve sus estadísticas, desarmando el rango', async () => {
      const { controller, getCollectorStatsUseCase } = setup();

      const response = await controller.getCollectorStats(
        { dateRange: { from: '2026-10-01', to: '2026-10-07' } },
        scopeWith(['COLLECTOR']),
      );

      expect(getCollectorStatsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        collectorMembershipId: 'membership-1',
        lenderId: 'lender-1',
        from: '2026-10-01',
        to: '2026-10-07',
      });
      expect(response.effectiveness).toBe(0.8);
    });

    it('sin dateRange, pide con from/to indefinidos', async () => {
      const { controller, getCollectorStatsUseCase } = setup();

      await controller.getCollectorStats({}, scopeWith(['COLLECTOR']));

      expect(getCollectorStatsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        collectorMembershipId: 'membership-1',
        lenderId: 'lender-1',
        from: undefined,
        to: undefined,
      });
    });

    it('sin el rol COLLECTOR responde 403 sin consultar nada', async () => {
      const { controller, getCollectorStatsUseCase } = setup();

      const error = await controller
        .getCollectorStats({}, scopeWith(['OWNER']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(getCollectorStatsUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
