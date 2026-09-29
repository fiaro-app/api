import { describe, expect, it, vi } from 'vitest';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/reset-password.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { PasswordResetCodeExpiredError } from '@/modules/auth/domain/errors/password-reset-code-expired.error.js';
import { PasswordResetCodeInvalidError } from '@/modules/auth/domain/errors/password-reset-code-invalid.error.js';
import { InvalidPasswordError } from '@/modules/auth/domain/errors/invalid-password.error.js';
import { WeakPasswordError } from '@/modules/auth/domain/errors/weak-password.error.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type {
  VerificationCode,
  VerificationCodeRepository,
} from '@/modules/auth/domain/repositories/verification-code.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const NOW = new Date('2026-09-28T18:00:00Z');
const PHONE = '+573001234567';
const VALID = {
  phoneNumber: PHONE,
  code: '048213',
  newPassword: 'la-contraseña-nueva-2',
};

const user = User.create({
  id: 'user-1',
  phone: MobilePhone.parse(PHONE),
  fullName: 'Ana Pérez',
  contactEmail: 'ana@example.com',
  contactEmailVerified: false,
  nationalId: null,
  mustChangePassword: false,
  createdAt: NOW,
});

function setup(
  options: {
    user?: User | null;
    pending?: VerificationCode | null;
  } = {},
) {
  const found = options.user === undefined ? user : options.user;
  const pending: VerificationCode | null =
    options.pending === undefined
      ? {
          hashedValue: 'hash(048213)',
          expiresAt: new Date(NOW.getTime() + 60_000),
        }
      : options.pending;

  const updatePassword = vi.fn(() => Promise.resolve());
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(() => Promise.resolve(found)),
    findById: vi.fn(() => Promise.resolve(found)),
    updatePassword,
    markContactEmailVerified: vi.fn(() => Promise.resolve()),
  };
  const deleteCode = vi.fn(() => Promise.resolve());
  const verificationCodes: VerificationCodeRepository = {
    replace: vi.fn(),
    find: vi.fn(() => Promise.resolve(pending)),
    delete: deleteCode,
  };
  const codeHasher: VerificationCodeHasher = {
    hash: (code) => `hash(${code})`,
  };
  const hash = vi.fn((password: string) =>
    Promise.resolve(`hash(${password})`),
  );
  const passwordHasher: PasswordHasher = { hash };
  const revokeAllForUser = vi.fn(() => Promise.resolve(2));
  const sessions: SessionRepository = { revokeAllForUser };
  const clock: Clock = { now: () => NOW };
  const useCase = new ResetPasswordUseCase(
    users,
    verificationCodes,
    codeHasher,
    passwordHasher,
    sessions,
    clock,
  );
  return { useCase, updatePassword, deleteCode, hash, revokeAllForUser };
}

describe('ResetPasswordUseCase.execute', () => {
  it('con el código correcto, cambia la contraseña, borra el código y cierra todas las sesiones', async () => {
    const { useCase, updatePassword, deleteCode, hash, revokeAllForUser } =
      setup();

    const result = await useCase.execute(VALID);

    expect(result).toEqual({ userId: 'user-1' });
    expect(hash).toHaveBeenCalledExactlyOnceWith(VALID.newPassword);
    expect(updatePassword).toHaveBeenCalledExactlyOnceWith(
      'user-1',
      `hash(${VALID.newPassword})`,
    );
    expect(deleteCode).toHaveBeenCalledExactlyOnceWith('password-reset:user-1');
    expect(revokeAllForUser).toHaveBeenCalledExactlyOnceWith('user-1');
  });

  it('sin cuenta con ese celular, rechaza con PasswordResetCodeInvalidError y no toca nada más', async () => {
    const { useCase, updatePassword, hash } = setup({ user: null });

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(
      PasswordResetCodeInvalidError,
    );
    expect(hash).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('sin un código pendiente, rechaza con PasswordResetCodeInvalidError', async () => {
    const { useCase } = setup({ pending: null });

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(
      PasswordResetCodeInvalidError,
    );
  });

  it('con el código vencido, rechaza con PasswordResetCodeExpiredError y lo borra', async () => {
    const { useCase, deleteCode, updatePassword } = setup({
      pending: {
        hashedValue: 'hash(048213)',
        expiresAt: new Date(NOW.getTime() - 1),
      },
    });

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(
      PasswordResetCodeExpiredError,
    );
    expect(deleteCode).toHaveBeenCalledExactlyOnceWith('password-reset:user-1');
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('con el código incorrecto, rechaza con PasswordResetCodeInvalidError sin borrar el pendiente', async () => {
    const { useCase, deleteCode, updatePassword } = setup({
      pending: {
        hashedValue: 'hash(otro-codigo)',
        expiresAt: new Date(NOW.getTime() + 60_000),
      },
    });

    await expect(useCase.execute(VALID)).rejects.toBeInstanceOf(
      PasswordResetCodeInvalidError,
    );
    expect(deleteCode).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('con el código correcto pero una contraseña nueva demasiado corta, rechaza con InvalidPasswordError', async () => {
    const { useCase, updatePassword } = setup();

    await expect(
      useCase.execute({ ...VALID, newPassword: 'corta' }),
    ).rejects.toBeInstanceOf(InvalidPasswordError);
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('con el código correcto pero una contraseña nueva demasiado fácil, rechaza con WeakPasswordError', async () => {
    const { useCase, updatePassword } = setup();

    await expect(
      useCase.execute({ ...VALID, newPassword: '12345678' }),
    ).rejects.toBeInstanceOf(WeakPasswordError);
    expect(updatePassword).not.toHaveBeenCalled();
  });
});
