import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuthHooks } from '@/modules/auth/infrastructure/better-auth/auth-hooks.js';
import {
  CHANGE_PASSWORD_PATH,
  CLIENT_IP_HEADER,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { SignInGuard } from '@/modules/auth/infrastructure/better-auth/sign-in-guard.js';

const PHONE = '+573001234567';
const origin = { ip: '10.0.0.7', userAgent: 'okhttp/4.12.0' };

const auditor = {
  signedIn: vi.fn(),
  signInFailed: vi.fn(),
  signedOut: vi.fn(),
  passwordChanged: vi.fn(),
  passwordChangeFailed: vi.fn(),
};
const guard = {
  admit: vi.fn<SignInGuard['admit']>(() => Promise.resolve()),
  forgive: vi.fn<SignInGuard['forgive']>(() => Promise.resolve()),
};
const hooks = createAuthHooks(
  auditor as unknown as AuthAuditor,
  guard as unknown as SignInGuard,
);

const run = (hook: unknown, context: object): Promise<unknown> =>
  (hook as (context: object) => Promise<unknown>)(context);

const request = {
  headers: new Headers({
    [CLIENT_IP_HEADER]: origin.ip,
    'user-agent': origin.userAgent,
  }),
};

function beforeSignIn(body: unknown = { phoneNumber: PHONE, password: 'x' }) {
  const findOne = vi.fn(() => Promise.resolve({ id: 'u1' }));
  const hash = vi.fn(() => Promise.resolve('hash'));
  return {
    findOne,
    hash,
    context: {
      path: SIGN_IN_PATH,
      body,
      request,
      context: { adapter: { findOne }, password: { hash } },
    },
  };
}

beforeEach(() => {
  guard.admit.mockClear();
  guard.forgive.mockClear();
});

describe('hooks.before al iniciar sesión: los intentos de un celular', () => {
  it('anota el intento con el celular y el origen, antes de nivelar el tiempo y de comprobar la contraseña', async () => {
    const { context, findOne } = beforeSignIn();
    guard.admit.mockImplementationOnce(() => {
      expect(findOne).not.toHaveBeenCalled();
      return Promise.resolve();
    });

    await run(hooks.before, context);

    expect(guard.admit).toHaveBeenCalledExactlyOnceWith(PHONE, origin);
  });

  it('si el celular agotó sus intentos rechaza sin nivelar el tiempo ni dejar que la ruta compruebe la contraseña', async () => {
    const { context, findOne, hash } = beforeSignIn();
    const locked = new APIError('TOO_MANY_REQUESTS', {
      code: 'SIGN_IN_LOCKED',
      message: 'bloqueado',
    });
    guard.admit.mockRejectedValueOnce(locked);

    await expect(run(hooks.before, context)).rejects.toBe(locked);

    expect(findOne).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });

  it('si el cuerpo no trae celular lo anota igual, sin él: better-auth rechazará el cuerpo', async () => {
    const { context } = beforeSignIn({ password: 'x' });

    await run(hooks.before, context);

    expect(guard.admit).toHaveBeenCalledExactlyOnceWith(undefined, origin);
  });

  it('las demás rutas no pasan por el bloqueo', async () => {
    await run(hooks.before, {
      path: CHANGE_PASSWORD_PATH,
      body: { newPassword: 'x' },
    });
    await run(hooks.before, { path: '/get-session' });

    expect(guard.admit).not.toHaveBeenCalled();
  });
});

describe('hooks.after al iniciar sesión: reiniciar los intentos', () => {
  const opened = {
    path: SIGN_IN_PATH,
    request,
    body: { phoneNumber: PHONE, password: 'x' },
  };

  it('si abrió sesión reinicia los intentos del celular que se envió', async () => {
    await run(hooks.after, {
      ...opened,
      context: { newSession: { user: { id: 'u1', phoneNumber: PHONE } } },
    });

    expect(guard.forgive).toHaveBeenCalledExactlyOnceWith(PHONE);
  });

  it('si lo rechazaron no reinicia nada: el intento ya quedó contado', async () => {
    await run(hooks.after, {
      ...opened,
      context: {
        returned: new APIError('UNAUTHORIZED', {
          code: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
          message: 'x',
        }),
      },
    });

    expect(guard.forgive).not.toHaveBeenCalled();
  });
});
