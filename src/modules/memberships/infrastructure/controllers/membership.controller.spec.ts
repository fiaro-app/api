import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { ChangeMembershipRolesUseCase } from '@/modules/memberships/application/use-cases/change-membership-roles.use-case.js';
import type { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import type { InviteMembershipUseCase } from '@/modules/memberships/application/use-cases/invite-membership.use-case.js';
import type { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import type { ResetMembershipPasswordUseCase } from '@/modules/memberships/application/use-cases/reset-membership-password.use-case.js';
import { MembershipController } from '@/modules/memberships/infrastructure/controllers/membership.controller.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const MEMBERSHIP_DETAILS = {
  id: 'membership-2',
  userId: 'user-2',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'] as const,
  status: 'ACTIVE' as const,
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
};

function setup() {
  const inviteMembershipUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({
        membership: MEMBERSHIP_DETAILS,
        tempPassword: 'TempAbc23456',
      }),
    ),
  };
  const deactivateMembershipUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({
        ...MEMBERSHIP_DETAILS,
        status: 'INACTIVE',
        deactivatedAt: CREATED_AT,
      }),
    ),
  };
  const changeMembershipRolesUseCase = {
    execute: vi.fn(() => Promise.resolve(MEMBERSHIP_DETAILS)),
  };
  const listMembershipsUseCase = {
    execute: vi.fn(() =>
      Promise.resolve({
        items: [
          {
            ...MEMBERSHIP_DETAILS,
            fullName: 'Luis Gómez',
            phone: '+573109998877',
          },
        ],
        total: 1,
      }),
    ),
  };
  const resetMembershipPasswordUseCase = {
    execute: vi.fn(() => Promise.resolve('TempNewAbc234')),
  };
  const controller = new MembershipController(
    inviteMembershipUseCase as unknown as InviteMembershipUseCase,
    deactivateMembershipUseCase as unknown as DeactivateMembershipUseCase,
    changeMembershipRolesUseCase as unknown as ChangeMembershipRolesUseCase,
    listMembershipsUseCase as unknown as ListMembershipsUseCase,
    resetMembershipPasswordUseCase as unknown as ResetMembershipPasswordUseCase,
  );
  return {
    controller,
    inviteMembershipUseCase,
    deactivateMembershipUseCase,
    changeMembershipRolesUseCase,
    listMembershipsUseCase,
    resetMembershipPasswordUseCase,
  };
}

const scopeWith = (
  roles: readonly string[],
  membershipId = 'membership-1',
): LenderScope => ({
  membershipId,
  lenderId: 'lender-1',
  roles,
});

describe('MembershipController', () => {
  it('publica QUERY, POST y PATCH, colgando de /memberships', () => {
    const publishedRoutes = Object.getOwnPropertyNames(
      MembershipController.prototype,
    )
      .flatMap((name) => {
        const handler = Reflect.get(
          MembershipController.prototype,
          name,
        ) as object;
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        return method === undefined ? [] : [RequestMethod[method]];
      })
      .sort();

    expect(publishedRoutes).toEqual(['PATCH', 'POST', 'POST', 'POST', 'QUERY']);
    expect(Reflect.getMetadata(PATH_METADATA, MembershipController)).toBe(
      'memberships',
    );
  });

  describe('listMemberships', () => {
    it('con rol LENDER busca colaboradores del prestamista de la sesión', async () => {
      const { controller, listMembershipsUseCase } = setup();

      const response = await controller.listMemberships(
        { page: 1, pageSize: 20 },
        scopeWith(['LENDER']),
      );

      expect(listMembershipsUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        page: 1,
        pageSize: 20,
      });
      expect(response.data).toHaveLength(1);
      expect(response.data[0]).toMatchObject({ fullName: 'Luis Gómez' });
    });

    it('con solo el rol COLLECTOR responde 403 sin buscar nada', async () => {
      const { controller, listMembershipsUseCase } = setup();

      const error = await controller
        .listMemberships({ page: 1, pageSize: 20 }, scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(listMembershipsUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('inviteMembership', () => {
    it('con rol OWNER invita a un colaborador', async () => {
      const { controller, inviteMembershipUseCase } = setup();

      const response = await controller.inviteMembership(
        {
          phone: '+573109998877',
          fullName: 'Luis Gómez',
          roles: ['COLLECTOR'],
          portfolioId: 'portfolio-1',
        },
        scopeWith(['OWNER']),
      );

      expect(inviteMembershipUseCase.execute).toHaveBeenCalledExactlyOnceWith({
        lenderId: 'lender-1',
        phone: '+573109998877',
        fullName: 'Luis Gómez',
        roles: ['COLLECTOR'],
        portfolioId: 'portfolio-1',
      });
      expect(response.tempPassword).toBe('TempAbc23456');
    });

    it('con solo el rol COLLECTOR responde 403 sin invitar a nadie', async () => {
      const { controller, inviteMembershipUseCase } = setup();

      const error = await controller
        .inviteMembership(
          { phone: '+573109998877', fullName: 'Luis Gómez', roles: ['LENDER'] },
          scopeWith(['COLLECTOR']),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(inviteMembershipUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('deactivateMembership', () => {
    it('con rol LENDER desactiva la membresía de otra persona', async () => {
      const { controller, deactivateMembershipUseCase } = setup();

      const response = await controller.deactivateMembership(
        'membership-2',
        scopeWith(['LENDER']),
      );

      expect(
        deactivateMembershipUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith('membership-2', 'lender-1');
      expect(response.status).toBe('INACTIVE');
    });

    it('no deja desactivar la propia membresía', async () => {
      const { controller, deactivateMembershipUseCase } = setup();

      const error = await controller
        .deactivateMembership(
          'membership-1',
          scopeWith(['OWNER'], 'membership-1'),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(deactivateMembershipUseCase.execute).not.toHaveBeenCalled();
    });

    it('con solo el rol COLLECTOR responde 403', async () => {
      const { controller, deactivateMembershipUseCase } = setup();

      const error = await controller
        .deactivateMembership('membership-2', scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(deactivateMembershipUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('changeMembershipRoles', () => {
    it('con rol OWNER cambia los roles de otra persona', async () => {
      const { controller, changeMembershipRolesUseCase } = setup();

      const response = await controller.changeMembershipRoles(
        'membership-2',
        { roles: ['LENDER'] },
        scopeWith(['OWNER']),
      );

      expect(
        changeMembershipRolesUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith(
        'membership-2',
        'lender-1',
        ['LENDER'],
        undefined,
      );
      expect(response.id).toBe('membership-2');
    });

    it('no deja cambiarse los roles a sí mismo', async () => {
      const { controller, changeMembershipRolesUseCase } = setup();

      const error = await controller
        .changeMembershipRoles(
          'membership-1',
          { roles: ['LENDER'] },
          scopeWith(['OWNER'], 'membership-1'),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(changeMembershipRolesUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('resetMembershipPassword', () => {
    it('con rol OWNER restablece la contraseña de otra persona', async () => {
      const { controller, resetMembershipPasswordUseCase } = setup();

      const response = await controller.resetMembershipPassword(
        'membership-2',
        scopeWith(['OWNER']),
      );

      expect(
        resetMembershipPasswordUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith('membership-2', 'lender-1');
      expect(response).toEqual({ tempPassword: 'TempNewAbc234' });
    });

    it('no deja restablecerse la contraseña a sí mismo', async () => {
      const { controller, resetMembershipPasswordUseCase } = setup();

      const error = await controller
        .resetMembershipPassword(
          'membership-1',
          scopeWith(['OWNER'], 'membership-1'),
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(resetMembershipPasswordUseCase.execute).not.toHaveBeenCalled();
    });

    it('con solo el rol COLLECTOR responde 403', async () => {
      const { controller, resetMembershipPasswordUseCase } = setup();

      const error = await controller
        .resetMembershipPassword('membership-2', scopeWith(['COLLECTOR']))
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(resetMembershipPasswordUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
