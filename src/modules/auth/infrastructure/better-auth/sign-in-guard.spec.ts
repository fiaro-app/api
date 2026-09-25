import { APIError } from 'better-auth/api';
import { describe, expect, it, vi } from 'vitest';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { SignInGuard } from '@/modules/auth/infrastructure/better-auth/sign-in-guard.js';
import { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';

const PHONE = '+573001234567';
const origin = { ip: '10.0.0.7', userAgent: 'okhttp/4.12.0' };
const masker = new PersonalDataMasker('un-secreto-de-prueba');

function setup(verdict = { allowed: true, retryAfterSeconds: 0 }) {
  const attempts = {
    register: vi.fn(() => Promise.resolve(verdict)),
    clear: vi.fn(() => Promise.resolve()),
  };
  const auditor = { signInLocked: vi.fn() };
  const guard = new SignInGuard(
    attempts,
    masker,
    auditor as unknown as AuthAuditor,
  );
  return { guard, attempts, auditor };
}

describe('SignInGuard.admit', () => {
  it('anota el intento con la huella del celular, nunca con el celular', async () => {
    const { guard, attempts } = setup();

    await guard.admit(PHONE, origin);

    expect(attempts.register).toHaveBeenCalledExactlyOnceWith(
      masker.mask(PHONE).hash,
    );
    expect(JSON.stringify(attempts.register.mock.calls)).not.toContain(
      '3001234567',
    );
  });

  it('deja pasar un intento que cabe, sin auditar nada', async () => {
    const { guard, auditor } = setup();

    await expect(guard.admit(PHONE, origin)).resolves.toBeUndefined();

    expect(auditor.signInLocked).not.toHaveBeenCalled();
  });

  it('rechaza con SIGN_IN_LOCKED (429) y X-Retry-After al celular que agotó sus intentos, y lo audita', async () => {
    const { guard, auditor } = setup({
      allowed: false,
      retryAfterSeconds: 612,
    });

    const rejected = await guard
      .admit(PHONE, origin)
      .catch((error: unknown) => error);

    expect(rejected).toBeInstanceOf(APIError);
    expect(rejected).toMatchObject({
      statusCode: 429,
      body: { code: 'SIGN_IN_LOCKED' },
    });
    expect(
      new Headers((rejected as APIError).headers).get('x-retry-after'),
    ).toBe('612');
    expect(auditor.signInLocked).toHaveBeenCalledExactlyOnceWith(
      PHONE,
      612,
      origin,
    );
  });

  it('sin celular en el cuerpo no cuenta nada: better-auth rechazará el cuerpo', async () => {
    const { guard, attempts } = setup();

    await guard.admit(undefined, origin);

    expect(attempts.register).not.toHaveBeenCalled();
  });
});

describe('SignInGuard.forgive', () => {
  it('reinicia los intentos de la huella del celular', async () => {
    const { guard, attempts } = setup();

    await guard.forgive(PHONE);

    expect(attempts.clear).toHaveBeenCalledExactlyOnceWith(
      masker.mask(PHONE).hash,
    );
  });

  it('sin celular no reinicia nada', async () => {
    const { guard, attempts } = setup();

    await guard.forgive(undefined);

    expect(attempts.clear).not.toHaveBeenCalled();
  });
});
