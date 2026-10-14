import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuthHooks } from '@/modules/auth/infrastructure/better-auth/auth-hooks.js';
import type { SignInGuard } from '@/modules/auth/infrastructure/better-auth/sign-in-guard.js';
import {
  CHANGE_PASSWORD_PATH,
  CLIENT_IP_HEADER,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';

const auditor = { passwordChangeFailed: vi.fn() };
const guard = {
  admit: vi.fn(() => Promise.resolve()),
  forgive: vi.fn(() => Promise.resolve()),
};
const prisma = { user: { findUnique: vi.fn(() => Promise.resolve(null)) } };
const hooks = createAuthHooks(
  auditor as unknown as AuthAuditor,
  guard as unknown as SignInGuard,
  prisma as unknown as PrismaService,
);

/** Los hooks de better-auth son middlewares que se invocan con un contexto a medida. */
const run = (context: object): Promise<unknown> =>
  (hooks.before as unknown as (context: object) => Promise<unknown>)(context);

describe('hooks.before al cambiar la contraseña: una nueva demasiado fácil de adivinar', () => {
  const session = {
    session: { id: 's1' },
    user: { id: 'u1', phoneNumber: '+573001234567', nationalId: '1032456789' },
  };
  const person = { id: 'u1', phone: '+573001234567' };
  const origin = { ip: '10.0.0.7', userAgent: 'okhttp/4.12.0' };

  const changeContext = (newPassword: unknown, current: unknown = session) => ({
    path: CHANGE_PASSWORD_PATH,
    body: { currentPassword: 'la-actual-1', newPassword },
    request: {
      headers: new Headers({
        [CLIENT_IP_HEADER]: origin.ip,
        'user-agent': origin.userAgent,
      }),
    },
    context: { session: current },
  });

  beforeEach(() => {
    auditor.passwordChangeFailed.mockClear();
  });

  it('rechaza una contraseña de las más usadas con PASSWORD_TOO_WEAK (400) y lo audita', async () => {
    await expect(run(changeContext('tequieromucho12'))).rejects.toMatchObject({
      statusCode: 400,
      body: { code: 'PASSWORD_TOO_WEAK' },
    });

    expect(auditor.passwordChangeFailed).toHaveBeenCalledExactlyOnceWith(
      person,
      'PASSWORD_TOO_WEAK',
      origin,
    );
  });

  it.each([
    ['un patrón', 'abcdefghijklmnop'],
    ['el celular de la persona', 'ana-3001234567-x'],
    ['la cédula de la persona', 'mi-cedula-1032456789'],
  ])('rechaza una contraseña que es %s', async (_caso, newPassword) => {
    await expect(run(changeContext(newPassword))).rejects.toMatchObject({
      body: { code: 'PASSWORD_TOO_WEAK' },
    });
  });

  it('deja pasar una contraseña que no es fácil de adivinar y sigue pidiendo revocar las demás sesiones', async () => {
    const context = changeContext('la-tienda-abre-a-las-seis');

    const result = await run(context);

    expect(result).toEqual({
      context: { body: { ...context.body, revokeOtherSessions: true } },
    });
    expect(auditor.passwordChangeFailed).not.toHaveBeenCalled();
  });

  it.each([
    ['muy corta', '1234'],
    ['de más de 128 caracteres', 'a'.repeat(129)],
    ['que no es un texto', 42],
    ['que falta', undefined],
  ])(
    'con una contraseña nueva %s no la juzga: better-auth la rechaza a su manera',
    async (_caso, newPassword) => {
      await expect(run(changeContext(newPassword))).resolves.toBeDefined();
      expect(auditor.passwordChangeFailed).not.toHaveBeenCalled();
    },
  );

  it('sin sesión no la juzga: la ruta responde 401', async () => {
    await expect(
      run(changeContext('password123', null)),
    ).resolves.toBeDefined();
    expect(auditor.passwordChangeFailed).not.toHaveBeenCalled();
  });
});
