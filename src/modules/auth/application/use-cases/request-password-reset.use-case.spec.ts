import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '@/modules/notifications/domain/email-message.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import type { VerificationCodeGenerator } from '@/modules/auth/application/ports/verification-code-generator.port.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { RequestPasswordResetUseCase } from '@/modules/auth/application/use-cases/request-password-reset.use-case.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type { VerificationCodeRepository } from '@/modules/auth/domain/repositories/verification-code.repository.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-09-28T18:00:00Z');
const PHONE = '+573001234567';

function userWith(contactEmail: string | null): User {
  return User.create({
    id: 'user-1',
    phone: MobilePhone.parse(PHONE),
    fullName: 'Ana Pérez',
    contactEmail,
    contactEmailVerified: false,
    nationalId: null,
    mustChangePassword: false,
    createdAt: NOW,
  });
}

function setup(user: User | null) {
  const users: UserRepository = {
    create: vi.fn(),
    findByPhone: vi.fn(() => Promise.resolve(user)),
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
  const useCase = new RequestPasswordResetUseCase(
    users,
    verificationCodes,
    codeGenerator,
    codeHasher,
    emailSender,
    clock,
  );
  return { useCase, users, replace, sent };
}

describe('RequestPasswordResetUseCase.execute', () => {
  it('con cuenta y correo de contacto, guarda el código hasheado 15 minutos y manda el correo', async () => {
    const { useCase, replace, sent } = setup(userWith('ana@example.com'));

    const done = await useCase.execute({ phoneNumber: PHONE });

    expect(done).toBe(true);
    expect(replace).toHaveBeenCalledExactlyOnceWith(
      'password-reset:user-1',
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

  it('sin cuenta con ese celular, no guarda ni manda nada', async () => {
    const { useCase, replace, sent } = setup(null);

    const done = await useCase.execute({ phoneNumber: PHONE });

    expect(done).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it('con cuenta pero sin correo de contacto, no guarda ni manda nada', async () => {
    const { useCase, replace, sent } = setup(userWith(null));

    const done = await useCase.execute({ phoneNumber: PHONE });

    expect(done).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });
});
