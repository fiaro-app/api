import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { GetCollectorRouteUseCase } from '@/modules/collections/application/use-cases/get-collector-route.use-case.js';
import { CollectorRouteController } from '@/modules/collections/infrastructure/controllers/collector-route.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const ROUTE = [
  {
    loanId: 'loan-1',
    clientId: 'client-1',
    clientFullName: 'Carlos Deudor',
    balance: 50_000,
    overdueAmount: 10_000,
    overdueDays: 2,
    nextDueDate: '2026-10-03',
  },
];

function setup() {
  const getCollectorRouteUseCase = {
    execute: vi.fn(() => Promise.resolve(ROUTE)),
  };
  const controller = new CollectorRouteController(
    getCollectorRouteUseCase as unknown as GetCollectorRouteUseCase,
  );
  return { controller, getCollectorRouteUseCase };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('CollectorRouteController', () => {
  it('publica QUERY, colgando de collectors/me/route', () => {
    const handler = Reflect.get(
      CollectorRouteController.prototype,
      'getCollectorRoute',
    ) as object;
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod;
    expect(RequestMethod[method]).toBe('QUERY');
    expect(Reflect.getMetadata(PATH_METADATA, CollectorRouteController)).toBe(
      'collectors/me/route',
    );
  });

  it('con rol COLLECTOR devuelve la ruta de la propia membresía', async () => {
    const { controller, getCollectorRouteUseCase } = setup();

    const response = await controller.getCollectorRoute(
      { date: '2026-10-02' },
      scopeWith(['COLLECTOR']),
    );

    expect(getCollectorRouteUseCase.execute).toHaveBeenCalledExactlyOnceWith({
      collectorMembershipId: 'membership-1',
      lenderId: 'lender-1',
      date: '2026-10-02',
    });
    expect(response).toEqual(ROUTE);
  });

  it('sin fecha, la pasa como undefined (hoy, para el caso de uso)', async () => {
    const { controller, getCollectorRouteUseCase } = setup();

    await controller.getCollectorRoute({}, scopeWith(['COLLECTOR']));

    expect(getCollectorRouteUseCase.execute).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ date: undefined }),
    );
  });

  it('sin rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
    const { controller, getCollectorRouteUseCase } = setup();

    const error = await controller
      .getCollectorRoute({}, scopeWith(['OWNER', 'LENDER']))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({
      code: 'FORBIDDEN',
    });
    expect(getCollectorRouteUseCase.execute).not.toHaveBeenCalled();
  });
});
