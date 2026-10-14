import { describe, expect, it, vi } from 'vitest';
import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import type { CreateUserUseCase } from '@/modules/auth/application/use-cases/create-user.use-case.js';
import type { GetUserByPhoneUseCase } from '@/modules/auth/application/use-cases/get-user-by-phone.use-case.js';
import type { AdminResetPasswordUseCase } from '@/modules/auth/application/use-cases/admin-reset-password.use-case.js';
import type { CollectorSeats } from '@/modules/memberships/application/services/collector-seats.js';
import type { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { InviteMembershipUseCase } from '@/modules/memberships/application/use-cases/invite-membership.use-case.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import type { TempPasswordGenerator } from '@/shared/application/ports/temp-password-generator.port.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const EXISTING_USER: CreatedUser = {
  id: 'user-existing',
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  contactEmail: null,
  contactEmailVerified: false,
  nationalId: null,
  mustChangePassword: false,
  createdAt: CREATED_AT,
};

const NEW_USER: CreatedUser = {
  id: 'user-new',
  phone: '+573109998877',
  fullName: 'Luis Gómez',
  contactEmail: null,
  contactEmailVerified: false,
  nationalId: '1030405060',
  mustChangePassword: true,
  createdAt: CREATED_AT,
};

const MEMBERSHIP = {
  id: 'membership-1',
  userId: 'user-new',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'] as const,
  status: 'ACTIVE' as const,
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
};

function setup(foundUser: typeof EXISTING_USER | null) {
  const getUserByPhoneExecute = vi.fn(() => Promise.resolve(foundUser));
  const getUserByPhone = {
    execute: getUserByPhoneExecute,
  } as unknown as GetUserByPhoneUseCase;

  const createUserExecute = vi.fn(() => Promise.resolve(NEW_USER));
  const createUser = {
    execute: createUserExecute,
  } as unknown as CreateUserUseCase;

  const createMembershipExecute = vi.fn(() => Promise.resolve(MEMBERSHIP));
  const createMembership = {
    execute: createMembershipExecute,
  } as unknown as CreateMembershipUseCase;

  const tempPasswords: TempPasswordGenerator = { next: () => 'TempAbc23456' };

  const sent: EmailMessage[] = [];
  const emailSender: EmailSender = { send: (message) => sent.push(message) };

  const memberships = {
    findByLenderAndNationalId: () => Promise.resolve(null),
    findActiveByUserId: () => Promise.resolve([]),
  } as unknown as MembershipRepository;
  const lock: LenderLock = { runExclusive: (_lenderId, work) => work() };

  const useCase = new InviteMembershipUseCase(
    getUserByPhone,
    createUser,
    createMembership,
    { execute: vi.fn() } as unknown as AdminResetPasswordUseCase,
    { assertAvailable: vi.fn() } as unknown as CollectorSeats,
    memberships,
    lock,
    tempPasswords,
    emailSender,
  );
  return {
    useCase,
    getUserByPhoneExecute,
    createUserExecute,
    createMembershipExecute,
    sent,
  };
}

describe('InviteMembershipUseCase', () => {
  it('si el celular ya tiene cuenta, solo agrega la membresía', async () => {
    const { useCase, createUserExecute, createMembershipExecute } =
      setup(EXISTING_USER);

    const invited = await useCase.execute({
      lenderId: 'lender-1',
      phone: '+573001234567',
      fullName: 'Nombre que se ignora',
      roles: ['LENDER'],
    });

    expect(createUserExecute).not.toHaveBeenCalled();
    expect(createMembershipExecute).toHaveBeenCalledExactlyOnceWith({
      userId: 'user-existing',
      lenderId: 'lender-1',
      roles: ['LENDER'],
      portfolioId: null,
    });
    expect(invited.tempPassword).toBeNull();
  });

  it('si el celular no tiene cuenta, la crea con mustChangePassword y devuelve la clave temporal', async () => {
    const { useCase, createUserExecute, createMembershipExecute } = setup(null);

    const invited = await useCase.execute({
      lenderId: 'lender-1',
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      nationalId: '1030405060',
      roles: ['COLLECTOR'],
      portfolioId: 'portfolio-1',
    });

    expect(createUserExecute).toHaveBeenCalledExactlyOnceWith({
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      password: 'TempAbc23456',
      nationalId: '1030405060',
      contactEmail: undefined,
      mustChangePassword: true,
    });
    expect(createMembershipExecute).toHaveBeenCalledExactlyOnceWith({
      userId: 'user-new',
      lenderId: 'lender-1',
      roles: ['COLLECTOR'],
      portfolioId: 'portfolio-1',
    });
    expect(invited.tempPassword).toBe('TempAbc23456');
  });

  it('si la persona nueva trae correo, le manda la clave temporal por correo', async () => {
    const { useCase, sent, createUserExecute } = setup(null);
    createUserExecute.mockResolvedValueOnce({
      ...NEW_USER,
      contactEmail: 'luis@example.com',
    });

    await useCase.execute({
      lenderId: 'lender-1',
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      nationalId: '1030405060',
      contactEmail: 'luis@example.com',
      roles: ['LENDER'],
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('luis@example.com');
    expect(sent[0]?.text).toContain('TempAbc23456');
  });

  it('una persona nueva sin correo no genera ningún envío', async () => {
    const { useCase, sent } = setup(null);

    await useCase.execute({
      lenderId: 'lender-1',
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      nationalId: '1030405060',
      roles: ['LENDER'],
    });

    expect(sent).toHaveLength(0);
  });

  it('rechaza una persona nueva con rol COLLECTOR sin cédula', async () => {
    const { useCase, createUserExecute } = setup(null);

    const error = await useCase
      .execute({
        lenderId: 'lender-1',
        phone: '+573109998877',
        fullName: 'Luis Gómez',
        roles: ['COLLECTOR'],
        portfolioId: 'portfolio-1',
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(InvalidMembershipDataError);
    expect((error as InvalidMembershipDataError).issues[0]?.path).toEqual([
      'nationalId',
    ]);
    expect(createUserExecute).not.toHaveBeenCalled();
  });

  it('rechaza roles inválidos antes de buscar el celular', async () => {
    const { useCase, getUserByPhoneExecute } = setup(null);

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        phone: '+573109998877',
        fullName: 'Luis Gómez',
        roles: [],
      }),
    ).rejects.toBeInstanceOf(InvalidMembershipDataError);
    expect(getUserByPhoneExecute).not.toHaveBeenCalled();
  });
});
