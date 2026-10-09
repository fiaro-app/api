import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { GetMembershipEntryUseCase } from '@/modules/memberships/application/use-cases/get-membership-entry.use-case.js';
import { MembershipController } from '@/modules/memberships/infrastructure/controllers/membership.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const ENTRY = {
  id: 'membership-2',
  userId: 'user-2',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'] as const,
  status: 'ACTIVE' as const,
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
  fullName: 'Luis Gómez',
  phone: '+573109998877',
};

function setup() {
  const getMembershipEntryUseCase = {
    execute: vi.fn(() => Promise.resolve(ENTRY)),
  };
  const unused = {} as never;
  const controller = new MembershipController(
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    getMembershipEntryUseCase as unknown as GetMembershipEntryUseCase,
  );
  return { controller, getMembershipEntryUseCase };
}

const scopeWith = (
  roles: readonly string[],
  membershipId = 'membership-1',
): LenderScope => ({ membershipId, lenderId: 'lender-1', roles });

describe('MembershipController.getMembership', () => {
  it('con rol OWNER devuelve el colaborador con nombre y celular', async () => {
    const { controller, getMembershipEntryUseCase } = setup();

    const response = await controller.getMembership(
      'membership-2',
      scopeWith(['OWNER']),
    );

    expect(getMembershipEntryUseCase.execute).toHaveBeenCalledExactlyOnceWith(
      'membership-2',
      'lender-1',
    );
    expect(response).toMatchObject({
      id: 'membership-2',
      fullName: 'Luis Gómez',
      phone: '+573109998877',
      createdAt: CREATED_AT.toISOString(),
    });
  });

  it('permite ver la propia membresía de la sesión', async () => {
    const { controller, getMembershipEntryUseCase } = setup();

    await controller.getMembership(
      'membership-1',
      scopeWith(['LENDER'], 'membership-1'),
    );

    expect(getMembershipEntryUseCase.execute).toHaveBeenCalledOnce();
  });

  it('sin rol OWNER ni LENDER lanza ForbiddenException', async () => {
    const { controller, getMembershipEntryUseCase } = setup();

    await expect(
      controller.getMembership('membership-2', scopeWith(['COLLECTOR'])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getMembershipEntryUseCase.execute).not.toHaveBeenCalled();
  });
});
