import { describe, expect, it, vi } from 'vitest';
import { DeactivateAccountUseCase } from '@/modules/auth/application/use-cases/deactivate-account.use-case.js';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { WrongPasswordError } from '@/modules/auth/domain/errors/wrong-password.error.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const NOW = new Date('2026-09-29T18:00:00Z');

const user = User.create({
  id: 'user-1',
  phone: MobilePhone.parse('+573001234567'),
  fullName: 'Ana Pérez',
  contactEmail: 'ana@example.com',
  contactEmailVerified: true,
  nationalId: null,
  mustChangePassword: false,
  createdAt: NOW,
});

function setup(
  options: {
    user?: User | null;
    passwordHash?: string | null;
    verifies?: boolean;
  } = {},
) {
  const found = options.user === undefined ? user : options.user;
  const passwordHash =
    options.passwordHash === undefined ? 'hash-guardado' : options.passwordHash;
  const verifies = options.verifies ?? true;

  const deactivate = vi.fn(() => Promise.resolve());
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(),
    findById: vi.fn(() => Promise.resolve(found)),
    updatePassword: vi.fn(),
    resetToTemporaryPassword: vi.fn(),
    markContactEmailVerified: vi.fn(),
    updateProfile: vi.fn(),
    findPasswordHash: vi.fn(() => Promise.resolve(passwordHash)),
    deactivate,
  };
  const verify = vi.fn(() => Promise.resolve(verifies));
  const passwordHasher: PasswordHasher = { hash: vi.fn(), verify };
  const revokeAllForUser = vi.fn(() => Promise.resolve(2));
  const sessions: SessionRepository = { revokeAllForUser };
  const clock: Clock = { now: () => NOW };
  const useCase = new DeactivateAccountUseCase(
    users,
    passwordHasher,
    sessions,
    clock,
  );
  return { useCase, deactivate, verify, revokeAllForUser };
}

describe('DeactivateAccountUseCase.execute', () => {
  it('con la contraseña correcta, desactiva la cuenta y cierra todas las sesiones', async () => {
    const { useCase, deactivate, verify, revokeAllForUser } = setup();

    await useCase.execute({ userId: 'user-1', password: 'la-actual' });

    expect(verify).toHaveBeenCalledExactlyOnceWith(
      'la-actual',
      'hash-guardado',
    );
    expect(deactivate).toHaveBeenCalledExactlyOnceWith('user-1', NOW);
    expect(revokeAllForUser).toHaveBeenCalledExactlyOnceWith('user-1');
  });

  it('con la contraseña incorrecta, rechaza con WrongPasswordError y no cambia nada', async () => {
    const { useCase, deactivate, revokeAllForUser } = setup({
      verifies: false,
    });

    await expect(
      useCase.execute({ userId: 'user-1', password: 'no-es-la-actual' }),
    ).rejects.toBeInstanceOf(WrongPasswordError);
    expect(deactivate).not.toHaveBeenCalled();
    expect(revokeAllForUser).not.toHaveBeenCalled();
  });

  it('sin una credencial guardada, rechaza con WrongPasswordError sin llamar a verify', async () => {
    const { useCase, verify, deactivate } = setup({ passwordHash: null });

    await expect(
      useCase.execute({ userId: 'user-1', password: 'cualquiera' }),
    ).rejects.toBeInstanceOf(WrongPasswordError);
    expect(verify).not.toHaveBeenCalled();
    expect(deactivate).not.toHaveBeenCalled();
  });

  it('sin una persona con ese id, lanza: es una ruta autenticada, no debería pasar', async () => {
    const { useCase } = setup({ user: null });

    await expect(
      useCase.execute({ userId: 'user-1', password: 'x' }),
    ).rejects.toThrow('La persona user-1 no existe.');
  });
});
