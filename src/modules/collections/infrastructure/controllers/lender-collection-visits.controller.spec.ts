import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { SummarizeCollectionRoutesUseCase } from '@/modules/collections/application/use-cases/summarize-collection-routes.use-case.js';
import type { SearchCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/search-collection-visits.use-case.js';
import { LenderCollectionVisitsController } from '@/modules/collections/infrastructure/controllers/lender-collection-visits.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const RESULT = {
  from: '2026-10-09',
  to: '2026-10-09',
  total: 1,
  items: [
    {
      visitId: 'visit-1',
      occurredAt: new Date('2026-10-09T15:00:00Z'),
      outcome: 'PAID' as const,
      expectedAmount: 10_000,
      promisedDate: null,
      loan: { id: 'loan-1' },
      client: { id: 'client-1', fullName: 'Carlos Ramírez' },
      collector: { membershipId: 'membership-1', fullName: 'Ana Cobradora' },
      payment: {
        id: 'payment-1',
        amount: 10_000,
        method: 'CASH' as const,
        reversed: false,
      },
    },
  ],
};

const ROUTES = {
  from: '2026-10-14',
  to: '2026-10-14',
  total: 1,
  items: [
    {
      date: '2026-10-14',
      collector: { membershipId: 'membership-2', fullName: 'Ana Soto' },
      startedAt: new Date('2026-10-14T13:05:00Z'),
      endedAt: new Date('2026-10-14T21:30:00Z'),
      visitsCount: 3,
      paidCount: 2,
      expectedAmount: 90_000,
      collectedAmount: 40_000,
    },
  ],
};

function setup() {
  const execute = vi.fn(() => Promise.resolve(RESULT));
  const summarize = vi.fn(() => Promise.resolve(ROUTES));
  const controller = new LenderCollectionVisitsController(
    { execute } as unknown as SearchCollectionVisitsUseCase,
    { execute: summarize } as unknown as SummarizeCollectionRoutesUseCase,
  );
  return { controller, execute, summarize };
}

const scopeWith = (roles: LenderScope['roles']): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('LenderCollectionVisitsController', () => {
  it('publica QUERY, colgando de /collection-visits', () => {
    const handler = Reflect.get(
      LenderCollectionVisitsController.prototype,
      'searchCollectionVisits',
    ) as object;
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      handler,
    ) as RequestMethod;
    expect(RequestMethod[method]).toBe('QUERY');
    expect(
      Reflect.getMetadata(PATH_METADATA, LenderCollectionVisitsController),
    ).toBe('collection-visits');
  });

  it.each([['OWNER'], ['LENDER']] as const)(
    'deja buscar a quien tiene el rol %s y arma la respuesta paginada',
    async (role) => {
      const { controller, execute } = setup();

      const response = await controller.searchCollectionVisits(
        {
          page: 1,
          pageSize: 20,
          dateRange: { from: '2026-10-01', to: '2026-10-09' },
          collectorMembershipId: 'membership-1',
          outcome: 'PAID',
        },
        scopeWith([role]),
      );

      expect(execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        from: '2026-10-01',
        to: '2026-10-09',
        collectorMembershipId: 'membership-1',
        portfolioId: undefined,
        outcome: 'PAID',
        page: 1,
        pageSize: 20,
      });
      expect(response.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
      expect(response.range).toEqual({ from: '2026-10-09', to: '2026-10-09' });
      expect(response.data[0]?.occurredAt).toBe('2026-10-09T15:00:00.000Z');
      expect(response.data[0]?.collector.fullName).toBe('Ana Cobradora');
    },
  );

  it('sin dateRange no manda fechas: el caso de uso decide el día', async () => {
    const { controller, execute } = setup();

    await controller.searchCollectionVisits(
      { page: 1, pageSize: 20 },
      scopeWith(['OWNER']),
    );

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ from: undefined, to: undefined }),
    );
  });

  it('rechaza con 403 a quien solo es COLLECTOR', async () => {
    const { controller, execute } = setup();

    await expect(
      controller.searchCollectionVisits(
        { page: 1, pageSize: 20 },
        scopeWith(['COLLECTOR']),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
  });

  describe('searchCollectionRoutes', () => {
    it('pasa el rango y los filtros al caso de uso y devuelve el registro con sus horas en ISO', async () => {
      const { controller, summarize } = setup();

      const response = await controller.searchCollectionRoutes(
        {
          page: 1,
          pageSize: 20,
          dateRange: { from: '2026-10-14', to: '2026-10-14' },
          collectorMembershipId: 'membership-2',
        },
        scopeWith(['LENDER']),
      );

      expect(summarize).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        from: '2026-10-14',
        to: '2026-10-14',
        collectorMembershipId: 'membership-2',
        portfolioId: undefined,
        page: 1,
        pageSize: 20,
      });
      expect(response.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
      expect(response.range).toEqual({ from: '2026-10-14', to: '2026-10-14' });
      expect(response.data[0]).toMatchObject({
        startedAt: '2026-10-14T13:05:00.000Z',
        endedAt: '2026-10-14T21:30:00.000Z',
        collectedAmount: 40_000,
      });
    });

    it('un cobrador que no administra recibe 403', async () => {
      const { controller, summarize } = setup();

      await expect(
        controller.searchCollectionRoutes(
          { page: 1, pageSize: 20 },
          scopeWith(['COLLECTOR']),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(summarize).not.toHaveBeenCalled();
    });
  });
});
