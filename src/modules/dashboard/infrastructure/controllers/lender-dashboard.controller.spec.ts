import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { LenderDashboard } from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';
import type { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import type { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import { LenderDashboardController } from '@/modules/dashboard/infrastructure/controllers/lender-dashboard.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DASHBOARD: LenderDashboard = {
  totalPortfolio: 1_000_000,
  collectedToday: 50_000,
  activeCollectors: 2,
  totalCollectors: 3,
  effectivenessToday: 0.5,
  clientsInArrears: 1,
  alerts: ['1 cobrador aún no ha iniciado su ruta hoy.'],
  pendingSettlements: [],
};

const STATS: LenderPeriodStats = {
  from: '2026-10-01',
  to: '2026-10-07',
  totalPortfolio: 1_000_000,
  portfolioAtRisk: 100_000,
  arrearsRate: 0.1,
  arrearsByAge: [
    { label: '0-7', amount: 100_000, clientsCount: 1 },
    { label: '8-15', amount: 0, clientsCount: 0 },
    { label: '16-30', amount: 0, clientsCount: 0 },
    { label: '30+', amount: 0, clientsCount: 0 },
  ],
  topArrears: [],
  collectorPerformance: [],
};

function setup() {
  const getLenderDashboardUseCase = {
    execute: vi.fn(() => Promise.resolve(DASHBOARD)),
  };
  const getLenderStatsUseCase = {
    execute: vi.fn(() => Promise.resolve(STATS)),
  };
  const controller = new LenderDashboardController(
    getLenderDashboardUseCase as unknown as GetLenderDashboardUseCase,
    getLenderStatsUseCase as unknown as GetLenderStatsUseCase,
  );
  return { controller, getLenderDashboardUseCase, getLenderStatsUseCase };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderDashboardController', () => {
  it('publica GET /dashboard y QUERY /stats (cuelga de /lenders/me)', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      LenderDashboardController.prototype,
    ).flatMap((name) => {
      const handler = Reflect.get(
        LenderDashboardController.prototype,
        name,
      ) as object;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        string | undefined;
      return method === undefined
        ? []
        : [`${RequestMethod[method]} ${path ?? ''}`];
    });

    expect(publishedRoutes.sort()).toEqual(['GET dashboard', 'QUERY stats']);
    expect(Reflect.getMetadata(PATH_METADATA, LenderDashboardController)).toBe(
      'lenders/me',
    );
  });

  describe('getLenderDashboard', () => {
    it.each([['OWNER'], ['LENDER']])(
      'con rol %s devuelve el resumen del negocio',
      async (role) => {
        const { controller, getLenderDashboardUseCase } = setup();

        const response = await controller.getLenderDashboard(scopeWith([role]));

        expect(
          getLenderDashboardUseCase.execute,
        ).toHaveBeenCalledExactlyOnceWith('lender-1');
        expect(response).toEqual(DASHBOARD);
      },
    );

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, getLenderDashboardUseCase } = setup();

      const error = await controller
        .getLenderDashboard(scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(getLenderDashboardUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getLenderStats', () => {
    it('con rol OWNER devuelve las estadísticas, pasando el período y los filtros', async () => {
      const { controller, getLenderStatsUseCase } = setup();

      const response = await controller.getLenderStats(
        {
          dateRange: { from: '2026-10-01', to: '2026-10-07' },
          collectorMembershipId: 'membership-2',
          portfolioId: 'portfolio-1',
        },
        scopeWith(['OWNER']),
      );

      expect(getLenderStatsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        from: '2026-10-01',
        to: '2026-10-07',
        collectorMembershipId: 'membership-2',
        portfolioId: 'portfolio-1',
      });
      expect(response).toEqual(STATS);
    });

    it('sin dateRange ni filtros, los pasa indefinidos', async () => {
      const { controller, getLenderStatsUseCase } = setup();

      await controller.getLenderStats({}, scopeWith(['LENDER']));

      expect(getLenderStatsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        from: undefined,
        to: undefined,
        collectorMembershipId: undefined,
        portfolioId: undefined,
      });
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, getLenderStatsUseCase } = setup();

      const error = await controller
        .getLenderStats({}, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(getLenderStatsUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
