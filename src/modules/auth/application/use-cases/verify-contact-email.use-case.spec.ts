import { describe, expect, it, vi } from 'vitest';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { VerifyContactEmailUseCase } from '@/modules/auth/application/use-cases/verify-contact-email.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { ContactEmailAlreadyVerifiedError } from '@/modules/auth/domain/errors/contact-email-already-verified.error.js';
import { ContactEmailVerificationCodeExpiredError } from '@/modules/auth/domain/errors/contact-email-verification-code-expired.error.js';
import { ContactEmailVerificationCodeInvalidError } from '@/modules/auth/domain/errors/contact-email-verification-code-invalid.error.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type {
  VerificationCode,
  VerificationCodeRepository,
} from '@/modules/auth/domain/repositories/verification-code.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const NOW = new Date('2026-09-29T18:00:00Z');

function userWith(contactEmailVerified: boolean): User {
  return User.create({
    id: 'user-1',
    phone: MobilePhone.parse('+573001234567'),
    fullName: 'Ana Pérez',
    contactEmail: 'ana@example.com',
    contactEmailVerified,
    nationalId: null,
    mustChangePassword: false,
    createdAt: NOW,
  });
}

function setup(
  options: {
    user?: User | null;
    pending?: VerificationCode | null;
  } = {},
) {
  const user = options.user === undefined ? userWith(false) : options.user;
  const pending: VerificationCode | null =
    options.pending === undefined
      ? {
          hashedValue: 'hash(048213)',
          expiresAt: new Date(NOW.getTime() + 60_000),
        }
      : options.pending;

  const markContactEmailVerified = vi.fn(() => Promise.resolve());
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(),
    findById: vi.fn(() => Promise.resolve(user)),
    updatePassword: vi.fn(),
    markContactEmailVerified,
    updateProfile: vi.fn(),
    findPasswordHash: vi.fn(),
    deactivate: vi.fn(),
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
  const clock: Clock = { now: () => NOW };
  const useCase = new VerifyContactEmailUseCase(
    users,
    verificationCodes,
    codeHasher,
    clock,
  );
  return { useCase, markContactEmailVerified, deleteCode };
}

describe('VerifyContactEmailUseCase.execute', () => {
  it('con el código correcto, marca el correo como verificado y borra el código', async () => {
    const { useCase, markContactEmailVerified, deleteCode } = setup();

    await useCase.execute({ userId: 'user-1', code: '048213' });

    expect(markContactEmailVerified).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(deleteCode).toHaveBeenCalledExactlyOnceWith(
      'contact-email-verification:user-1',
    );
  });

  it('si ya está verificado, rechaza con ContactEmailAlreadyVerifiedError', async () => {
    const { useCase, markContactEmailVerified } = setup({
      user: userWith(true),
    });

    await expect(
      useCase.execute({ userId: 'user-1', code: '048213' }),
    ).rejects.toBeInstanceOf(ContactEmailAlreadyVerifiedError);
    expect(markContactEmailVerified).not.toHaveBeenCalled();
  });

  it('sin un código pendiente, rechaza con ContactEmailVerificationCodeInvalidError', async () => {
    const { useCase } = setup({ pending: null });

    await expect(
      useCase.execute({ userId: 'user-1', code: '048213' }),
    ).rejects.toBeInstanceOf(ContactEmailVerificationCodeInvalidError);
  });

  it('con el código vencido, rechaza con ContactEmailVerificationCodeExpiredError y lo borra', async () => {
    const { useCase, deleteCode, markContactEmailVerified } = setup({
      pending: {
        hashedValue: 'hash(048213)',
        expiresAt: new Date(NOW.getTime() - 1),
      },
    });

    await expect(
      useCase.execute({ userId: 'user-1', code: '048213' }),
    ).rejects.toBeInstanceOf(ContactEmailVerificationCodeExpiredError);
    expect(deleteCode).toHaveBeenCalledExactlyOnceWith(
      'contact-email-verification:user-1',
    );
    expect(markContactEmailVerified).not.toHaveBeenCalled();
  });

  it('con el código incorrecto, rechaza con ContactEmailVerificationCodeInvalidError sin borrar el pendiente', async () => {
    const { useCase, deleteCode, markContactEmailVerified } = setup({
      pending: {
        hashedValue: 'hash(otro-codigo)',
        expiresAt: new Date(NOW.getTime() + 60_000),
      },
    });

    await expect(
      useCase.execute({ userId: 'user-1', code: '048213' }),
    ).rejects.toBeInstanceOf(ContactEmailVerificationCodeInvalidError);
    expect(deleteCode).not.toHaveBeenCalled();
    expect(markContactEmailVerified).not.toHaveBeenCalled();
  });

  it('sin una persona con ese id, lanza: es una ruta autenticada, no debería pasar', async () => {
    const { useCase } = setup({ user: null });

    await expect(
      useCase.execute({ userId: 'user-1', code: '048213' }),
    ).rejects.toThrow('La persona user-1 no existe.');
  });
});
