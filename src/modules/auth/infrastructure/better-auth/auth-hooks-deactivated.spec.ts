import { APIError } from 'better-auth/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
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

function setupHooks(deactivatedAt: Date | null) {
  const findUnique = vi.fn(() => Promise.resolve({ deactivatedAt }));
  const prisma = { user: { findUnique } };
  const hooks = createAuthHooks(
    auditor as unknown as AuthAuditor,
    guard as unknown as SignInGuard,
    prisma as unknown as PrismaService,
  );
  return { hooks, findUnique };
}

const run = (hook: unknown, context: object): Promise<unknown> =>
  (hook as (context: object) => Promise<unknown>)(context);

const request = {
  headers: new Headers({
    [CLIENT_IP_HEADER]: origin.ip,
    'user-agent': origin.userAgent,
  }),
};

function signInContext(body: unknown = { phoneNumber: PHONE, password: 'x' }) {
  const findOne = vi.fn(() => Promise.resolve(null));
  const hash = vi.fn(() => Promise.resolve('hash'));
  return {
    path: SIGN_IN_PATH,
    body,
    request,
    context: { adapter: { findOne }, password: { hash } },
  };
}

beforeEach(() => {
  guard.admit.mockClear();
  auditor.signInFailed.mockClear();
});

describe('hooks.before al iniciar sesión: cuenta desactivada', () => {
  it('con una cuenta activa (deactivatedAt nulo) deja seguir', async () => {
    const { hooks, findUnique } = setupHooks(null);

    await expect(run(hooks.before, signInContext())).resolves.toBeUndefined();

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { phone: PHONE },
      select: { deactivatedAt: true },
    });
    expect(auditor.signInFailed).not.toHaveBeenCalled();
  });

  it('con un celular sin cuenta (Prisma no encuentra la fila) deja seguir', async () => {
    const findUnique = vi.fn(() => Promise.resolve(null));
    const hooks = createAuthHooks(
      auditor as unknown as AuthAuditor,
      guard as unknown as SignInGuard,
      { user: { findUnique } } as unknown as PrismaService,
    );

    await expect(run(hooks.before, signInContext())).resolves.toBeUndefined();
  });

  it('con una cuenta desactivada rechaza con ACCOUNT_DEACTIVATED (403) y audita el celular', async () => {
    const { hooks } = setupHooks(new Date('2026-09-29T00:00:00Z'));

    const rejected = await run(hooks.before, signInContext()).catch(
      (error: unknown) => error,
    );

    expect(rejected).toBeInstanceOf(APIError);
    expect(rejected).toMatchObject({
      status: 'FORBIDDEN',
      body: { code: 'ACCOUNT_DEACTIVATED' },
    });
    expect(auditor.signInFailed).toHaveBeenCalledExactlyOnceWith(
      PHONE,
      'ACCOUNT_DEACTIVATED',
      origin,
    );
  });

  it('corre después del bloqueo por celular: si ya agotó sus intentos, ni siquiera consulta la desactivación', async () => {
    const { hooks, findUnique } = setupHooks(new Date());
    const locked = new APIError('TOO_MANY_REQUESTS', {
      code: 'SIGN_IN_LOCKED',
      message: 'bloqueado',
    });
    guard.admit.mockRejectedValueOnce(locked);

    await expect(run(hooks.before, signInContext())).rejects.toBe(locked);

    expect(findUnique).not.toHaveBeenCalled();
  });

  it('sin celular en el cuerpo no consulta nada: better-auth rechazará el cuerpo', async () => {
    const { hooks, findUnique } = setupHooks(new Date());

    await run(hooks.before, signInContext({ password: 'x' }));

    expect(findUnique).not.toHaveBeenCalled();
  });

  it('las demás rutas no pasan por este rechazo', async () => {
    const { hooks } = setupHooks(new Date());

    await run(hooks.before, {
      path: CHANGE_PASSWORD_PATH,
      body: { newPassword: 'x' },
    });

    expect(auditor.signInFailed).not.toHaveBeenCalled();
  });
});
