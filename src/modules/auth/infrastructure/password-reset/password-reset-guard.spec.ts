import { describe, expect, it, vi } from 'vitest';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { PasswordResetCodeInvalidError } from '@/modules/auth/domain/errors/password-reset-code-invalid.error.js';
import { PasswordResetGuard } from '@/modules/auth/infrastructure/password-reset/password-reset-guard.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';

const PHONE = '+573001234567';
const masker = new PersonalDataMasker('un-secreto-de-prueba');

function setup(
  requestVerdict: { allowed: boolean; retryAfterSeconds: number } = {
    allowed: true,
    retryAfterSeconds: 0,
  },
  verifyVerdict: { allowed: boolean; retryAfterSeconds: number } = {
    allowed: true,
    retryAfterSeconds: 0,
  },
) {
  const registerRequest = vi.fn(() => Promise.resolve(requestVerdict));
  const clearRequest = vi.fn(() => Promise.resolve());
  const registerVerify = vi.fn(() => Promise.resolve(verifyVerdict));
  const clearVerify = vi.fn(() => Promise.resolve());
  const requestAttempts: SignInAttempts = {
    register: registerRequest,
    clear: clearRequest,
  };
  const verifyAttempts: SignInAttempts = {
    register: registerVerify,
    clear: clearVerify,
  };
  const guard = new PasswordResetGuard(requestAttempts, verifyAttempts, masker);
  return { guard, registerRequest, clearRequest, registerVerify, clearVerify };
}

describe('PasswordResetGuard.admitRequest', () => {
  it('anota el intento con la huella del celular y dice si hay cupo', async () => {
    const { guard, registerRequest } = setup();

    const allowed = await guard.admitRequest(PHONE);

    expect(registerRequest).toHaveBeenCalledExactlyOnceWith(
      masker.mask(PHONE).hash,
    );
    expect(allowed).toBe(true);
  });

  it('sin cupo, dice que no hay y nunca lanza', async () => {
    const { guard } = setup({ allowed: false, retryAfterSeconds: 60 });

    await expect(guard.admitRequest(PHONE)).resolves.toBe(false);
  });
});

describe('PasswordResetGuard.admitVerification', () => {
  it('con cupo, no lanza', async () => {
    const { guard, registerVerify } = setup();

    await expect(guard.admitVerification(PHONE)).resolves.toBeUndefined();

    expect(registerVerify).toHaveBeenCalledExactlyOnceWith(
      masker.mask(PHONE).hash,
    );
  });

  it('sin cupo, lanza PasswordResetCodeInvalidError, igual que un código incorrecto', async () => {
    const { guard } = setup(undefined, {
      allowed: false,
      retryAfterSeconds: 60,
    });

    await expect(guard.admitVerification(PHONE)).rejects.toBeInstanceOf(
      PasswordResetCodeInvalidError,
    );
  });
});

describe('PasswordResetGuard.forgiveVerification', () => {
  it('olvida los intentos de canje con la huella del celular', async () => {
    const { guard, clearVerify } = setup();

    await guard.forgiveVerification(PHONE);

    expect(clearVerify).toHaveBeenCalledExactlyOnceWith(
      masker.mask(PHONE).hash,
    );
  });
});
