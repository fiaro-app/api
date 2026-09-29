import { describe, expect, it, vi } from 'vitest';
import { UpdateProfileUseCase } from '@/modules/auth/application/use-cases/update-profile.use-case.js';
import { RequestContactEmailVerificationUseCase } from '@/modules/auth/application/use-cases/request-contact-email-verification.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { InvalidUserDataError } from '@/modules/auth/domain/errors/invalid-user-data.error.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const NOW = new Date('2026-09-29T18:00:00Z');

function userWith(
  fullName: string,
  contactEmail: string | null,
  contactEmailVerified: boolean,
): User {
  return User.create({
    id: 'user-1',
    phone: MobilePhone.parse('+573001234567'),
    fullName,
    contactEmail,
    contactEmailVerified,
    nationalId: null,
    mustChangePassword: false,
    createdAt: NOW,
  });
}

function setup(user: User | null) {
  const updateProfile = vi.fn(() => Promise.resolve());
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(),
    findById: vi.fn(() => Promise.resolve(user)),
    updatePassword: vi.fn(),
    markContactEmailVerified: vi.fn(),
    updateProfile,
    findPasswordHash: vi.fn(),
    deactivate: vi.fn(),
  };
  const requestVerificationExecute = vi.fn(() => Promise.resolve(true));
  const requestVerification = {
    execute: requestVerificationExecute,
  } as unknown as RequestContactEmailVerificationUseCase;
  const useCase = new UpdateProfileUseCase(users, requestVerification);
  return { useCase, updateProfile, requestVerificationExecute };
}

describe('UpdateProfileUseCase.execute', () => {
  it('con un nombre nuevo, lo reemplaza y no toca el correo ni su verificación', async () => {
    const { useCase, updateProfile, requestVerificationExecute } = setup(
      userWith('Ana Pérez', 'ana@example.com', true),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      fullName: 'Ana Pérez Gómez',
    });

    expect(updateProfile).toHaveBeenCalledExactlyOnceWith('user-1', {
      fullName: 'Ana Pérez Gómez',
      contactEmail: 'ana@example.com',
      contactEmailVerified: true,
    });
    expect(result).toEqual({
      fullName: 'Ana Pérez Gómez',
      contactEmail: 'ana@example.com',
      contactEmailVerified: true,
    });
    expect(requestVerificationExecute).not.toHaveBeenCalled();
  });

  it('con un correo de contacto nuevo, quita la verificación y pide un código', async () => {
    const { useCase, updateProfile, requestVerificationExecute } = setup(
      userWith('Ana Pérez', 'vieja@example.com', true),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      contactEmail: 'nueva@example.com',
    });

    expect(updateProfile).toHaveBeenCalledExactlyOnceWith('user-1', {
      fullName: 'Ana Pérez',
      contactEmail: 'nueva@example.com',
      contactEmailVerified: false,
    });
    expect(result.contactEmailVerified).toBe(false);
    expect(requestVerificationExecute).toHaveBeenCalledExactlyOnceWith({
      userId: 'user-1',
    });
  });

  it('con el mismo correo de contacto, no toca la verificación ni pide un código', async () => {
    const { useCase, updateProfile, requestVerificationExecute } = setup(
      userWith('Ana Pérez', 'ana@example.com', true),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      contactEmail: 'ana@example.com',
    });

    expect(updateProfile).toHaveBeenCalledExactlyOnceWith('user-1', {
      fullName: 'Ana Pérez',
      contactEmail: 'ana@example.com',
      contactEmailVerified: true,
    });
    expect(result.contactEmailVerified).toBe(true);
    expect(requestVerificationExecute).not.toHaveBeenCalled();
  });

  it('quitando el correo de contacto (null), lo borra, quita la verificación y no pide código', async () => {
    const { useCase, updateProfile, requestVerificationExecute } = setup(
      userWith('Ana Pérez', 'ana@example.com', true),
    );

    const result = await useCase.execute({
      userId: 'user-1',
      contactEmail: null,
    });

    expect(updateProfile).toHaveBeenCalledExactlyOnceWith('user-1', {
      fullName: 'Ana Pérez',
      contactEmail: null,
      contactEmailVerified: false,
    });
    expect(result.contactEmail).toBeNull();
    expect(requestVerificationExecute).not.toHaveBeenCalled();
  });

  it('con un correo que no cumple el contrato, rechaza con InvalidUserDataError y no guarda nada', async () => {
    const { useCase, updateProfile } = setup(
      userWith('Ana Pérez', null, false),
    );

    await expect(
      useCase.execute({ userId: 'user-1', contactEmail: 'no-es-un-correo' }),
    ).rejects.toBeInstanceOf(InvalidUserDataError);
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('con un nombre vacío, rechaza con InvalidUserDataError', async () => {
    const { useCase } = setup(userWith('Ana Pérez', null, false));

    await expect(
      useCase.execute({ userId: 'user-1', fullName: '   ' }),
    ).rejects.toBeInstanceOf(InvalidUserDataError);
  });

  it('sin una persona con ese id, lanza: es una ruta autenticada, no debería pasar', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute({ userId: 'user-1', fullName: 'Ana' }),
    ).rejects.toThrow('La persona user-1 no existe.');
  });
});
