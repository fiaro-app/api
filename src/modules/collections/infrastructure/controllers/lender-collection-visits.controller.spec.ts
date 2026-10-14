import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
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

function setup() {
  const execute = vi.fn(() => Promise.resolve(RESULT));
  const controller = new LenderCollectionVisitsController({
    execute,
  } as unknown as SearchCollectionVisitsUseCase);
  return { controller, execute };
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
});
