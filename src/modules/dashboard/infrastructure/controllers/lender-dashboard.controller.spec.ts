import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { LenderDashboard } from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';
import type { GetLenderDashboardUseCase } from '@/modules/dashboard/application/use-cases/get-lender-dashboard.use-case.js';
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

function setup() {
  const getLenderDashboardUseCase = {
    execute: vi.fn(() => Promise.resolve(DASHBOARD)),
  };
  const controller = new LenderDashboardController(
    getLenderDashboardUseCase as unknown as GetLenderDashboardUseCase,
  );
  return { controller, getLenderDashboardUseCase };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderDashboardController', () => {
  it('publica solo GET /dashboard (cuelga de /lenders/me)', () => {
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

    expect(publishedRoutes).toEqual(['GET dashboard']);
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
});
