import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { DeleteMembershipUseCase } from '@/modules/memberships/application/use-cases/delete-membership.use-case.js';
import type { ReactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/reactivate-membership.use-case.js';
import { MembershipLifecycleController } from '@/modules/memberships/infrastructure/controllers/membership-lifecycle.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup() {
  const reactivate = vi.fn(() =>
    Promise.resolve({
      id: 'membership-2',
      userId: 'user-2',
      lenderId: 'lender-1',
      roles: ['COLLECTOR' as const],
      status: 'ACTIVE' as const,
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
      deactivatedAt: null,
    }),
  );
  const remove = vi.fn(() => Promise.resolve());
  const controller = new MembershipLifecycleController(
    { execute: reactivate } as unknown as ReactivateMembershipUseCase,
    { execute: remove } as unknown as DeleteMembershipUseCase,
  );
  return { controller, reactivate, remove };
}

const scopeWith = (
  roles: readonly string[],
  membershipId = 'membership-1',
): LenderScope => ({ membershipId, lenderId: 'lender-1', roles });

describe('MembershipLifecycleController', () => {
  it('con rol LENDER reactiva a otra persona', async () => {
    const { controller, reactivate } = setup();

    const response = await controller.reactivateMembership(
      'membership-2',
      scopeWith(['LENDER']),
    );

    expect(reactivate).toHaveBeenCalledExactlyOnceWith(
      'membership-2',
      'lender-1',
    );
    expect(response).toMatchObject({ status: 'ACTIVE', deactivatedAt: null });
  });

  it('con rol OWNER borra otra membresía', async () => {
    const { controller, remove } = setup();

    await controller.deleteMembership('membership-2', scopeWith(['OWNER']));

    expect(remove).toHaveBeenCalledExactlyOnceWith('membership-2', 'lender-1');
  });

  it('nunca sobre la propia membresía ni con solo el rol COLLECTOR', async () => {
    const { controller, reactivate, remove } = setup();

    await expect(
      controller.reactivateMembership('membership-1', scopeWith(['OWNER'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.deleteMembership('membership-2', scopeWith(['COLLECTOR'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reactivate).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
