import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import type { ListCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/list-collection-visits.use-case.js';
import { CollectionVisitController } from '@/modules/collections/infrastructure/controllers/collection-visit.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'visit-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  outcome: 'PAID' as const,
  expectedAmount: 30_000,
  promisedDate: null,
  occurredAt: new Date('2026-10-01T14:00:00Z'),
  createdAt: new Date('2026-10-01T14:05:00Z'),
  payment: {
    id: 'payment-1',
    loanId: 'loan-1',
    visitId: 'visit-1',
    amount: 30_000,
    method: 'CASH' as const,
    occurredAt: new Date('2026-10-01T14:00:00Z'),
    createdAt: new Date('2026-10-01T14:05:00Z'),
  },
};

function setup() {
  const createCollectionVisitUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const listCollectionVisitsUseCase = {
    execute: vi.fn(() => Promise.resolve([DETAILS])),
  };
  const controller = new CollectionVisitController(
    createCollectionVisitUseCase as unknown as CreateCollectionVisitUseCase,
    listCollectionVisitsUseCase as unknown as ListCollectionVisitsUseCase,
  );
  return {
    controller,
    createCollectionVisitUseCase,
    listCollectionVisitsUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('CollectionVisitController', () => {
  it('publica POST y GET, colgando de loans/:loanId/collection-visits', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      CollectionVisitController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          CollectionVisitController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['GET', 'POST']);
    expect(Reflect.getMetadata(PATH_METADATA, CollectionVisitController)).toBe(
      'loans/:loanId/collection-visits',
    );
  });

  describe('createCollectionVisit', () => {
    it('con rol COLLECTOR registra la visita, con la membresía de la sesión', async () => {
      const { controller, createCollectionVisitUseCase } = setup();

      const response = await controller.createCollectionVisit(
        'loan-1',
        {
          id: 'visit-1',
          outcome: 'PAID',
          occurredAt: '2026-10-01T14:00:00.000Z',
          payment: { amount: 30_000 },
        },
        scopeWith(['COLLECTOR']),
      );

      expect(
        createCollectionVisitUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        id: 'visit-1',
        outcome: 'PAID',
        promisedDate: undefined,
        occurredAt: new Date('2026-10-01T14:00:00.000Z'),
        payment: { amount: 30_000 },
      });
      expect(response.id).toBe('visit-1');
    });

    it('sin rol COLLECTOR responde 403 sin registrar nada', async () => {
      const { controller, createCollectionVisitUseCase } = setup();

      const error = await controller
        .createCollectionVisit(
          'loan-1',
          {
            id: 'visit-1',
            outcome: 'NOT_FOUND',
            occurredAt: '2026-10-01T14:00:00.000Z',
          },
          scopeWith(['OWNER', 'LENDER']),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(createCollectionVisitUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('listCollectionVisits', () => {
    it('devuelve el historial, para cualquier rol', async () => {
      const { controller, listCollectionVisitsUseCase } = setup();

      const response = await controller.listCollectionVisits(
        'loan-1',
        scopeWith(['LENDER']),
      );

      expect(
        listCollectionVisitsUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith('loan-1', 'lender-1');
      expect(response).toHaveLength(1);
    });
  });
});
