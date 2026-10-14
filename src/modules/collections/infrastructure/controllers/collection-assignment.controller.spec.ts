import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import type { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { CollectionAssignmentController } from '@/modules/collections/infrastructure/controllers/collection-assignment.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const DETAILS = {
  id: 'assignment-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

function setup() {
  const createCollectionAssignmentUseCase = {
    execute: vi.fn(() => Promise.resolve(DETAILS)),
  };
  const listCollectionAssignmentsUseCase = {
    execute: vi.fn(() => Promise.resolve([DETAILS])),
  };
  const controller = new CollectionAssignmentController(
    createCollectionAssignmentUseCase as unknown as CreateCollectionAssignmentUseCase,
    listCollectionAssignmentsUseCase as unknown as ListCollectionAssignmentsUseCase,
  );
  return {
    controller,
    createCollectionAssignmentUseCase,
    listCollectionAssignmentsUseCase,
  };
}

const scopeWith = (roles: readonly string[]): LenderScope => ({
  membershipId: 'membership-admin',
  lenderId: 'lender-1',
  roles,
});

describe('CollectionAssignmentController', () => {
  it('publica POST y GET, colgando de loans/:loanId/collection-assignments', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      CollectionAssignmentController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          CollectionAssignmentController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['GET', 'POST']);
    expect(
      Reflect.getMetadata(PATH_METADATA, CollectionAssignmentController),
    ).toBe('loans/:loanId/collection-assignments');
  });

  describe('createCollectionAssignment', () => {
    it('con rol OWNER crea la asignación', async () => {
      const { controller, createCollectionAssignmentUseCase } = setup();

      const response = await controller.createCollectionAssignment(
        'loan-1',
        { collectorMembershipId: 'membership-1', effectiveFrom: '2026-10-01' },
        scopeWith(['OWNER']),
      );

      expect(
        createCollectionAssignmentUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
      });
      expect(response.id).toBe('assignment-1');
    });

    it('con solo el rol COLLECTOR responde 403 sin crear nada', async () => {
      const { controller, createCollectionAssignmentUseCase } = setup();

      const error = await controller
        .createCollectionAssignment(
          'loan-1',
          {
            collectorMembershipId: 'membership-1',
            effectiveFrom: '2026-10-01',
          },
          scopeWith(['COLLECTOR']),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(createCollectionAssignmentUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('listCollectionAssignments', () => {
    it('devuelve el historial, para cualquier rol', async () => {
      const { controller, listCollectionAssignmentsUseCase } = setup();

      const response = await controller.listCollectionAssignments(
        'loan-1',
        scopeWith(['COLLECTOR']),
      );

      expect(
        listCollectionAssignmentsUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith('loan-1', 'lender-1');
      expect(response).toHaveLength(1);
    });
  });
});
