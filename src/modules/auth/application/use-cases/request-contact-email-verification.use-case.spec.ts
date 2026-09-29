import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import type { VerificationCodeGenerator } from '@/modules/auth/application/ports/verification-code-generator.port.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { RequestContactEmailVerificationUseCase } from '@/modules/auth/application/use-cases/request-contact-email-verification.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { ContactEmailAlreadyVerifiedError } from '@/modules/auth/domain/errors/contact-email-already-verified.error.js';
import { ContactEmailNotSetError } from '@/modules/auth/domain/errors/contact-email-not-set.error.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type { VerificationCodeRepository } from '@/modules/auth/domain/repositories/verification-code.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

const NOW = new Date('2026-09-29T18:00:00Z');

function userWith(
  contactEmail: string | null,
  contactEmailVerified: boolean,
): User {
  return User.create({
    id: 'user-1',
    phone: MobilePhone.parse('+573001234567'),
    fullName: 'Ana Pérez',
    contactEmail,
    contactEmailVerified,
    nationalId: null,
    mustChangePassword: false,
    createdAt: NOW,
  });
}

function setup(user: User | null) {
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(),
    findById: vi.fn(() => Promise.resolve(user)),
    updatePassword: vi.fn(),
    markContactEmailVerified: vi.fn(),
    updateProfile: vi.fn(),
    findPasswordHash: vi.fn(),
    deactivate: vi.fn(),
  };
  const replace = vi.fn(() => Promise.resolve());
  const verificationCodes: VerificationCodeRepository = {
    replace,
    find: vi.fn(),
    delete: vi.fn(),
  };
  const codeGenerator: VerificationCodeGenerator = { next: () => '048213' };
  const codeHasher: VerificationCodeHasher = {
    hash: (code) => `hash(${code})`,
  };
  const sent: EmailMessage[] = [];
  const emailSender: EmailSender = { send: (message) => sent.push(message) };
  const clock: Clock = { now: () => NOW };
  const useCase = new RequestContactEmailVerificationUseCase(
    users,
    verificationCodes,
    codeGenerator,
    codeHasher,
    emailSender,
    clock,
  );
  return { useCase, replace, sent };
}

describe('RequestContactEmailVerificationUseCase.execute', () => {
  it('con correo de contacto sin verificar, guarda el código hasheado 15 minutos y manda el correo', async () => {
    const { useCase, replace, sent } = setup(
      userWith('ana@example.com', false),
    );

    await useCase.execute({ userId: 'user-1' });

    expect(replace).toHaveBeenCalledExactlyOnceWith(
      'contact-email-verification:user-1',
      'hash(048213)',
      new Date(NOW.getTime() + 15 * 60 * 1_000),
    );
    expect(sent).toEqual([
      expect.objectContaining({
        to: 'ana@example.com',
        text: expect.stringContaining('048213'),
      }),
    ]);
  });

  it('sin correo de contacto, rechaza con ContactEmailNotSetError y no manda nada', async () => {
    const { useCase, replace, sent } = setup(userWith(null, false));

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(
      ContactEmailNotSetError,
    );
    expect(replace).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it('con el correo ya verificado, rechaza con ContactEmailAlreadyVerifiedError', async () => {
    const { useCase, replace } = setup(userWith('ana@example.com', true));

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(
      ContactEmailAlreadyVerifiedError,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('sin una persona con ese id, lanza: es una ruta autenticada, no debería pasar', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toThrow(
      'La persona user-1 no existe.',
    );
  });
});
