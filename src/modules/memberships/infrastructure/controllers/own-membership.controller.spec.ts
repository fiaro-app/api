import { describe, expect, it, vi } from 'vitest';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { OwnMembershipController } from '@/modules/memberships/infrastructure/controllers/own-membership.controller.js';

describe('OwnMembershipController', () => {
  it('devuelve la membresía de la sesión, sea cual sea su rol', async () => {
    const execute = vi.fn(() =>
      Promise.resolve({
        id: 'membership-1',
        userId: 'user-1',
        lenderId: 'lender-1',
        roles: ['COLLECTOR' as const],
        status: 'ACTIVE' as const,
        portfolioId: 'portfolio-1',
        createdAt: new Date('2026-10-01T00:00:00Z'),
        deactivatedAt: null,
      }),
    );
    const controller = new OwnMembershipController({
      execute,
    } as unknown as GetMembershipUseCase);

    const response = await controller.getOwnMembership({
      membershipId: 'membership-1',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
    });

    expect(execute).toHaveBeenCalledWith('membership-1', 'lender-1');
    expect(response).toMatchObject({
      id: 'membership-1',
      roles: ['COLLECTOR'],
    });
  });
});
