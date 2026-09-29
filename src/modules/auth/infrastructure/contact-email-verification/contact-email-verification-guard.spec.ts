import { describe, expect, it, vi } from 'vitest';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { ContactEmailVerificationCodeInvalidError } from '@/modules/auth/domain/errors/contact-email-verification-code-invalid.error.js';
import { ContactEmailVerificationGuard } from '@/modules/auth/infrastructure/contact-email-verification/contact-email-verification-guard.js';

const USER_ID = 'user-1';

function setup(
  verdict: { allowed: boolean; retryAfterSeconds: number } = {
    allowed: true,
    retryAfterSeconds: 0,
  },
) {
  const register = vi.fn(() => Promise.resolve(verdict));
  const clear = vi.fn(() => Promise.resolve());
  const verifyAttempts: SignInAttempts = { register, clear };
  const guard = new ContactEmailVerificationGuard(verifyAttempts);
  return { guard, register, clear };
}

describe('ContactEmailVerificationGuard.admitVerification', () => {
  it('anota el intento con el id de la persona directo, sin enmascarar', async () => {
    const { guard, register } = setup();

    await expect(guard.admitVerification(USER_ID)).resolves.toBeUndefined();

    expect(register).toHaveBeenCalledExactlyOnceWith(USER_ID);
  });

  it('sin cupo, lanza ContactEmailVerificationCodeInvalidError, igual que un código incorrecto', async () => {
    const { guard } = setup({ allowed: false, retryAfterSeconds: 60 });

    await expect(guard.admitVerification(USER_ID)).rejects.toBeInstanceOf(
      ContactEmailVerificationCodeInvalidError,
    );
  });
});

describe('ContactEmailVerificationGuard.forgiveVerification', () => {
  it('olvida los intentos de canje de esa persona', async () => {
    const { guard, clear } = setup();

    await guard.forgiveVerification(USER_ID);

    expect(clear).toHaveBeenCalledExactlyOnceWith(USER_ID);
  });
});
