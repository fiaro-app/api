import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { DeactivateCollectorUseCase } from '@/modules/collections/application/use-cases/deactivate-collector.use-case.js';
import { CollectorController } from '@/modules/collections/infrastructure/controllers/collector.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const RESULT = { membershipId: 'membership-collector', reassignedLoans: 2 };

function setup() {
  const deactivateCollectorUseCase = {
    execute: vi.fn(() => Promise.resolve(RESULT)),
  };
  const controller = new CollectorController(
    deactivateCollectorUseCase as unknown as DeactivateCollectorUseCase,
  );
  return { controller, deactivateCollectorUseCase };
}

const scopeWith = (
  roles: readonly string[],
  membershipId = 'membership-admin',
): LenderScope => ({
  membershipId,
  lenderId: 'lender-1',
  roles,
});

describe('CollectorController', () => {
  it('publica POST, colgando de collectors', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      CollectorController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          CollectorController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['POST']);
    expect(Reflect.getMetadata(PATH_METADATA, CollectorController)).toBe(
      'collectors',
    );
  });

  describe('deactivateCollector', () => {
    it('con rol LENDER da de baja al cobrador, reasignando sus préstamos', async () => {
      const { controller, deactivateCollectorUseCase } = setup();

      const response = await controller.deactivateCollector(
        'membership-collector',
        {
          reassignments: [
            { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
          ],
        },
        scopeWith(['LENDER']),
      );

      expect(
        deactivateCollectorUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-collector',
        reassignments: [
          { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
        ],
      });
      expect(response).toEqual({
        id: 'membership-collector',
        status: 'INACTIVE',
        reassignedLoans: 2,
      });
    });

    it('no deja dar de baja la propia membresía', async () => {
      const { controller, deactivateCollectorUseCase } = setup();

      const error = await controller
        .deactivateCollector(
          'membership-admin',
          { reassignments: [] },
          scopeWith(['OWNER'], 'membership-admin'),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(deactivateCollectorUseCase.execute).not.toHaveBeenCalled();
    });

    it('con solo el rol COLLECTOR responde 403 sin dar de baja a nadie', async () => {
      const { controller, deactivateCollectorUseCase } = setup();

      const error = await controller
        .deactivateCollector(
          'membership-collector',
          { reassignments: [] },
          scopeWith(['COLLECTOR']),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(deactivateCollectorUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
