import {
  ForbiddenException,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { GetSettlementUseCase } from '@/modules/settlements/application/use-cases/get-settlement.use-case.js';
import type { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import type { ReviewSettlementUseCase } from '@/modules/settlements/application/use-cases/review-settlement.use-case.js';
import type { SubmitSettlementUseCase } from '@/modules/settlements/application/use-cases/submit-settlement.use-case.js';
import type { CancelSettlementUseCase } from '@/modules/settlements/application/use-cases/cancel-settlement.use-case.js';
import { DailySettlementController } from '@/modules/settlements/infrastructure/controllers/daily-settlement.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'settlement-1',
  collectorMembershipId: 'membership-1',
  date: '2026-10-01',
  expectedAmount: 100_000,
  collectedAmount: 100_000,
  collectedCash: 100_000,
  collectedNequi: 0,
  collectedTransfer: 0,
  status: 'PENDING' as const,
  collectorNote: null,
  reviewNote: null,
  reviewedByMembershipId: null,
  reviewedAt: null,
  submittedAt: new Date('2026-10-01T22:00:00Z'),
  createdAt: new Date('2026-10-01T22:00:00Z'),
};

const SUBMIT_BODY = {
  expectedAmount: 100_000,
  collectedCash: 100_000,
  collectedNequi: 0,
  collectedTransfer: 0,
};

function setup() {
  const submitSettlementUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const getSettlementUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const listSettlementsUseCase = {
    execute: vi.fn(() => Promise.resolve({ items: [DETAILS], total: 1 })),
  };
  const reviewSettlementUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({ ...DETAILS, status: 'APPROVED' as const }),
    ),
  };
  const controller = new DailySettlementController(
    submitSettlementUseCase as unknown as SubmitSettlementUseCase,
    { execute: vi.fn() } as unknown as CancelSettlementUseCase,
    getSettlementUseCase as unknown as GetSettlementUseCase,
    listSettlementsUseCase as unknown as ListSettlementsUseCase,
    reviewSettlementUseCase as unknown as ReviewSettlementUseCase,
  );
  return {
    controller,
    submitSettlementUseCase,
    getSettlementUseCase,
    listSettlementsUseCase,
    reviewSettlementUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles,
});

describe('DailySettlementController', () => {
  it('publica POST, GET, QUERY, dos POST de revisión y uno de cancelar, todas colgando de /daily-settlements', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      DailySettlementController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          DailySettlementController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(
      ['POST', 'GET', 'QUERY', 'POST', 'POST', 'POST'].sort(),
    );
    expect(Reflect.getMetadata(PATH_METADATA, DailySettlementController)).toBe(
      'daily-settlements',
    );
  });

  describe('submitSettlement', () => {
    it('con rol COLLECTOR cierra el día, con su propia membresía', async () => {
      const { controller, submitSettlementUseCase } = setup();

      const response = await controller.submitSettlement(
        SUBMIT_BODY,
        scopeWith(['COLLECTOR']),
      );

      expect(submitSettlementUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-1',
        expectedAmount: 100_000,
        collectedCash: 100_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        collectorNote: null,
      });
      expect(response.id).toBe('settlement-1');
    });

    it('con una nota, la pasa al caso de uso', async () => {
      const { controller, submitSettlementUseCase } = setup();

      await controller.submitSettlement(
        { ...SUBMIT_BODY, collectorNote: 'Un cliente no pagó.' },
        scopeWith(['COLLECTOR']),
      );

      expect(submitSettlementUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ collectorNote: 'Un cliente no pagó.' }),
      );
    });

    it('sin rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, submitSettlementUseCase } = setup();

      const error = await controller
        .submitSettlement(SUBMIT_BODY, scopeWith(['OWNER', 'LENDER']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'FORBIDDEN',
      });
      expect(submitSettlementUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('getSettlement', () => {
    it('devuelve el cuadre propio a un cobrador y cualquiera a quien administra', async () => {
      const { controller, getSettlementUseCase } = setup();

      const response = await controller.getSettlement(
        'settlement-1',
        scopeWith(['COLLECTOR']),
      );
      await controller.getSettlement('settlement-1', {
        ...scopeWith(['OWNER']),
        membershipId: 'otro',
      });

      expect(getSettlementUseCase.execute).toHaveBeenCalledWith(
        'settlement-1',
        'lender-1',
      );
      expect(response.id).toBe('settlement-1');
    });

    it('un cobrador no ve el cuadre de otro: 404, como si no existiera', async () => {
      const { controller } = setup();

      await expect(
        controller.getSettlement('settlement-1', {
          ...scopeWith(['COLLECTOR']),
          membershipId: 'otro-cobrador',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listSettlements', () => {
    it('devuelve la página de cuadres del prestamista; un cobrador solo ve los suyos', async () => {
      const { controller, listSettlementsUseCase } = setup();

      const response = await controller.listSettlements(
        { page: 1, pageSize: 20 },
        scopeWith(['COLLECTOR']),
      );

      expect(listSettlementsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        page: 1,
        pageSize: 20,
        collectorMembershipId: 'membership-1',
      });
      expect(response.meta).toEqual({ page: 1, pageSize: 20, total: 1 });
      expect(response.data).toHaveLength(1);
    });

    it('traduce dateRange a from y to, y pasa la cartera y el cobrador', async () => {
      const { controller, listSettlementsUseCase } = setup();

      await controller.listSettlements(
        {
          page: 2,
          pageSize: 10,
          collectorMembershipId: 'membership-2',
          portfolioId: 'portfolio-1',
          status: 'PENDING',
          dateRange: { from: '2026-10-01', to: '2026-10-31' },
        },
        scopeWith(['OWNER']),
      );

      expect(listSettlementsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        page: 2,
        pageSize: 10,
        collectorMembershipId: 'membership-2',
        portfolioId: 'portfolio-1',
        status: 'PENDING',
        from: '2026-10-01',
        to: '2026-10-31',
      });
    });
  });

  describe('approveSettlement', () => {
    it('con rol OWNER aprueba, con la membresía de quien revisa', async () => {
      const { controller, reviewSettlementUseCase } = setup();

      const response = await controller.approveSettlement(
        'settlement-1',
        {},
        scopeWith(['OWNER']),
      );

      expect(reviewSettlementUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        settlementId: 'settlement-1',
        reviewerMembershipId: 'membership-1',
        status: 'APPROVED',
        reviewNote: null,
      });
      expect(response.status).toBe('APPROVED');
    });

    it('con rol LENDER también aprueba', async () => {
      const { controller, reviewSettlementUseCase } = setup();

      await controller.approveSettlement(
        'settlement-1',
        {},
        scopeWith(['LENDER']),
      );

      expect(reviewSettlementUseCase.execute).toHaveBeenCalledOnce();
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, reviewSettlementUseCase } = setup();

      const error = await controller
        .approveSettlement('settlement-1', {}, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(reviewSettlementUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('rejectSettlement', () => {
    it('con rol OWNER rechaza, con el comentario', async () => {
      const { controller, reviewSettlementUseCase } = setup();

      await controller.rejectSettlement(
        'settlement-1',
        { reviewNote: 'Falta soportar la diferencia.' },
        scopeWith(['OWNER']),
      );

      expect(reviewSettlementUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        settlementId: 'settlement-1',
        reviewerMembershipId: 'membership-1',
        status: 'REJECTED',
        reviewNote: 'Falta soportar la diferencia.',
      });
    });

    it('con solo el rol COLLECTOR responde 403 sin llamar al caso de uso', async () => {
      const { controller, reviewSettlementUseCase } = setup();

      const error = await controller
        .rejectSettlement('settlement-1', {}, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(reviewSettlementUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
