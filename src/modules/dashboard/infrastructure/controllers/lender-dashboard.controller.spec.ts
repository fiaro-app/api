import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { LenderDashboard } from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';
import type { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import type { LenderStatsExport } from '@/modules/dashboard/application/dtos/lender-stats-export.dto.js';
import type { GetLenderStatsExportUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats-export.use-case.js';
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
  period: { from: '2026-10-07', to: '2026-10-07' },
  collectedInPeriod: 0,
  expectedInPeriod: 0,
  effectivenessInPeriod: null,
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
  expectedAmount: 0,
  collectedAmount: 0,
  effectiveness: null,
  previous: null,
};

const STATS_EXPORT: LenderStatsExport = {
  stats: STATS,
  lenderName: 'Créditos Ana',
};

function fakeResponse() {
  const headers = new Map<string, string>();
  const res = {
    status: vi.fn(() => res),
    setHeader: vi.fn((name: string, value: string) => headers.set(name, value)),
    end: vi.fn(),
  };
  return { res: res as unknown as Response, headers, endCalls: res.end };
}

function setup() {
  const getLenderDashboardUseCase = {
    execute: vi.fn(() => Promise.resolve(DASHBOARD)),
  };
  const getLenderStatsUseCase = {
    execute: vi.fn(() => Promise.resolve(STATS)),
  };
  const getLenderStatsExportUseCase = {
    execute: vi.fn(() => Promise.resolve(STATS_EXPORT)),
  };
  const controller = new LenderDashboardController(
    getLenderDashboardUseCase as unknown as GetLenderDashboardUseCase,
    getLenderStatsUseCase as unknown as GetLenderStatsUseCase,
    getLenderStatsExportUseCase as unknown as GetLenderStatsExportUseCase,
  );
  return {
    controller,
    getLenderDashboardUseCase,
    getLenderStatsUseCase,
    getLenderStatsExportUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderDashboardController', () => {
  it('publica GET /dashboard, QUERY /stats y QUERY /stats/export (cuelga de /lenders/me)', () => {
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

    expect(publishedRoutes.sort()).toEqual([
      'GET dashboard',
      'QUERY stats',
      'QUERY stats/export',
    ]);
    expect(Reflect.getMetadata(PATH_METADATA, LenderDashboardController)).toBe(
      'lenders/me',
    );
  });

  describe('getLenderDashboard', () => {
    it.each([['OWNER'], ['LENDER']])(
      'con rol %s devuelve el resumen del negocio',
      async (role) => {
        const { controller, getLenderDashboardUseCase } = setup();

        const response = await controller.getLenderDashboard(
          {},
          scopeWith([role]),
        );

        expect(
          getLenderDashboardUseCase.execute,
        ).toHaveBeenCalledExactlyOnceWith('lender-1', {});
        expect(response).toEqual(DASHBOARD);
      },
    );

    it('pasa el período al caso de uso', async () => {
      const { controller, getLenderDashboardUseCase } = setup();

      await controller.getLenderDashboard(
        { from: '2026-10-01', to: '2026-10-07' },
        scopeWith(['OWNER']),
      );

      expect(getLenderDashboardUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        'lender-1',
        {
          from: '2026-10-01',
          to: '2026-10-07',
        },
      );
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, getLenderDashboardUseCase } = setup();

      const error = await controller
        .getLenderDashboard({}, scopeWith(['COLLECTOR']))
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

    it('pasa includePrevious al caso de uso', async () => {
      const { controller, getLenderStatsUseCase } = setup();

      await controller.getLenderStats(
        { includePrevious: true },
        scopeWith(['OWNER']),
      );

      expect(getLenderStatsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ includePrevious: true }),
      );
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
        includePrevious: undefined,
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

  describe('getLenderStatsExport', () => {
    it('con rol OWNER escribe el PDF con los encabezados correctos', async () => {
      const { controller, getLenderStatsExportUseCase } = setup();
      const { res, headers, endCalls } = fakeResponse();

      await controller.getLenderStatsExport(
        { format: 'pdf', collectorMembershipId: 'membership-2' },
        scopeWith(['OWNER']),
        res,
      );

      expect(
        getLenderStatsExportUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        from: undefined,
        to: undefined,
        collectorMembershipId: 'membership-2',
        portfolioId: undefined,
        includePrevious: undefined,
      });
      expect(headers.get('Content-Type')).toBe('application/pdf');
      expect(headers.get('Content-Disposition')).toContain('2026-10-01');
      expect(endCalls).toHaveBeenCalledOnce();
      const [sentPdf] = endCalls.mock.calls[0] as [Buffer];
      expect(sentPdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, getLenderStatsExportUseCase } = setup();
      const { res } = fakeResponse();

      const error = await controller
        .getLenderStatsExport({ format: 'pdf' }, scopeWith(['COLLECTOR']), res)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(getLenderStatsExportUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
