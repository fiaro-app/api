import { describe, expect, it, vi } from 'vitest';
import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import type { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import type { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import type { GetUserByPhoneUseCase } from '@/modules/auth/application/use-cases/get-user-by-phone.use-case.js';
import type { CollectorSeats } from '@/modules/memberships/application/services/collector-seats.js';
import type { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { InviteMembershipUseCase } from '@/modules/memberships/application/use-cases/invite-membership.use-case.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { CollaboratorNationalIdTakenError } from '@/modules/memberships/domain/errors/collaborator-national-id-taken.error.js';
import { CollectorLimitReachedError } from '@/modules/memberships/domain/errors/collector-limit-reached.error.js';
import { MembershipAlreadyExistsError } from '@/modules/memberships/domain/errors/membership-already-exists.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';

/**
 * Las reglas que `InviteMembershipUseCase` revisa con el candado del prestamista tomado: cupo del
 * plan, cédula única por negocio y alta interrumpida. El alta en sí vive en
 * `invite-membership.use-case.spec.ts`.
 */

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const PERSON: CreatedUser = {
  id: 'user-1',
  phone: '+573109998877',
  fullName: 'Luis Gómez',
  contactEmail: null,
  contactEmailVerified: false,
  nationalId: '1020304050',
  mustChangePassword: false,
  createdAt: CREATED_AT,
};

const COLLECTOR_INPUT = {
  lenderId: 'lender-1',
  phone: '+573109998877',
  fullName: 'Luis Gómez',
  nationalId: '1030405060',
  roles: ['COLLECTOR' as const],
  portfolioId: 'portfolio-1',
};

const holder = (userId: string) =>
  Membership.create({
    id: 'membership-9',
    userId,
    lenderId: 'lender-1',
    roles: ['COLLECTOR'],
    status: 'INACTIVE',
    portfolioId: 'portfolio-1',
    createdAt: CREATED_AT,
    deactivatedAt: CREATED_AT,
  });

function setup(found: CreatedUser | null) {
  const findByLenderAndNationalId = vi.fn<
    MembershipRepository['findByLenderAndNationalId']
  >(() => Promise.resolve(null));
  const findActiveByUserId = vi.fn<MembershipRepository['findActiveByUserId']>(
    () => Promise.resolve([]),
  );
  const assertAvailable = vi.fn(() => Promise.resolve());
  const adminReset = vi.fn(() => Promise.resolve('TempReset2345'));
  const createUser = vi.fn(() =>
    Promise.resolve({ ...PERSON, id: 'user-new', mustChangePassword: true }),
  );
  const locked: string[] = [];
  const lock: LenderLock = {
    runExclusive: (lenderId, work) => {
      locked.push(lenderId);
      return work();
    },
  };
  const useCase = new InviteMembershipUseCase(
    {
      execute: () => Promise.resolve(found),
    } as unknown as GetUserByPhoneUseCase,
    { execute: createUser } as unknown as CreateUserUseCase,
    {
      execute: (input: { userId: string }) =>
        Promise.resolve({
          id: 'membership-new',
          userId: input.userId,
          lenderId: 'lender-1',
          roles: ['COLLECTOR'],
          status: 'ACTIVE',
          portfolioId: 'portfolio-1',
          createdAt: CREATED_AT,
        }),
    } as unknown as CreateMembershipUseCase,
    { execute: adminReset } as unknown as AdminResetPasswordUseCase,
    { assertAvailable } as unknown as CollectorSeats,
    {
      findByLenderAndNationalId,
      findActiveByUserId,
    } as unknown as MembershipRepository,
    lock,
    { next: () => 'TempAbc23456' },
    { send: vi.fn() },
  );
  return {
    useCase,
    findByLenderAndNationalId,
    findActiveByUserId,
    assertAvailable,
    adminReset,
    createUser,
    locked,
  };
}

describe('InviteMembershipUseCase: reglas con el candado del prestamista', () => {
  it('toma el candado del prestamista y revisa el cupo de un cobrador nuevo', async () => {
    const { useCase, locked, assertAvailable } = setup(null);

    await useCase.execute(COLLECTOR_INPUT);

    expect(locked).toEqual(['lender-1']);
    expect(assertAvailable).toHaveBeenCalledExactlyOnceWith('lender-1');
  });

  it('no revisa el cupo para un rol que no cobra', async () => {
    const { useCase, assertAvailable } = setup(PERSON);

    await useCase.execute({ ...COLLECTOR_INPUT, roles: ['LENDER'] });

    expect(assertAvailable).not.toHaveBeenCalled();
  });

  it('sin cupo no crea a la persona', async () => {
    const { useCase, assertAvailable, createUser } = setup(null);
    assertAvailable.mockRejectedValueOnce(new CollectorLimitReachedError(5));

    await expect(useCase.execute(COLLECTOR_INPUT)).rejects.toBeInstanceOf(
      CollectorLimitReachedError,
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rechaza una cédula que ya tiene otra persona del mismo negocio, normalizada', async () => {
    const { useCase, findByLenderAndNationalId, createUser } = setup(null);
    findByLenderAndNationalId.mockResolvedValueOnce(holder('user-other'));

    await expect(
      useCase.execute({ ...COLLECTOR_INPUT, nationalId: '1.030.405.060' }),
    ).rejects.toBeInstanceOf(CollaboratorNationalIdTakenError);
    expect(findByLenderAndNationalId).toHaveBeenCalledWith(
      'lender-1',
      '1030405060',
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it('si la cédula es de la misma persona, ya tiene membresía aquí', async () => {
    const { useCase, findByLenderAndNationalId } = setup(PERSON);
    findByLenderAndNationalId.mockResolvedValueOnce(holder('user-1'));

    await expect(useCase.execute(COLLECTOR_INPUT)).rejects.toBeInstanceOf(
      MembershipAlreadyExistsError,
    );
  });

  it('usa la cédula de la cuenta existente, no la del pedido', async () => {
    const { useCase, findByLenderAndNationalId } = setup(PERSON);

    await useCase.execute({ ...COLLECTOR_INPUT, nationalId: '999' });

    expect(findByLenderAndNationalId).toHaveBeenCalledExactlyOnceWith(
      'lender-1',
      '1020304050',
    );
  });

  it('completa un alta interrumpida con una contraseña temporal nueva', async () => {
    const { useCase, adminReset } = setup({
      ...PERSON,
      mustChangePassword: true,
    });

    const invited = await useCase.execute(COLLECTOR_INPUT);

    expect(adminReset).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(invited.tempPassword).toBe('TempReset2345');
  });

  it('no toca la contraseña de quien ya trabaja en otro negocio', async () => {
    const { useCase, adminReset, findActiveByUserId } = setup({
      ...PERSON,
      mustChangePassword: true,
    });
    findActiveByUserId.mockResolvedValueOnce([holder('user-1')]);

    const invited = await useCase.execute(COLLECTOR_INPUT);

    expect(adminReset).not.toHaveBeenCalled();
    expect(invited.tempPassword).toBeNull();
  });
});
