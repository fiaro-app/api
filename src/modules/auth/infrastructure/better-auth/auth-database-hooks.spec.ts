import { describe, expect, it, vi } from 'vitest';
import {
  CHANGE_PASSWORD_PATH,
  REVOKE_OTHER_SESSIONS_PATH,
  REVOKE_SESSIONS_PATH,
  SIGN_OUT_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuthDatabaseHooks } from '@/modules/auth/infrastructure/better-auth/auth-database-hooks.js';

const request = new Request('https://api.fiaro.co/auth/sign-out', {
  headers: { 'x-fiaro-client-ip': '203.0.113.7', 'user-agent': 'Fiaro/1.0' },
});

function setup() {
  const signedOut = vi.fn();
  const sessionRevoked = vi.fn();
  const hooks = createAuthDatabaseHooks({
    signedOut,
    sessionRevoked,
  } as unknown as AuthAuditor);
  const after = hooks.session?.delete?.after as (
    session: object,
    context: object | null,
  ) => Promise<void>;
  return { signedOut, sessionRevoked, after };
}

describe('createAuthDatabaseHooks', () => {
  it('avisa cuando se borra la sesión al cerrar sesión, con quién era y desde dónde', async () => {
    const { after, signedOut } = setup();

    await after({ id: 's1', userId: 'u1' }, { path: SIGN_OUT_PATH, request });

    expect(signedOut).toHaveBeenCalledExactlyOnceWith('u1', {
      ip: '203.0.113.7',
      userAgent: 'Fiaro/1.0',
    });
  });

  it.each([
    [
      'una sesión que revoca un cambio de contraseña',
      { path: CHANGE_PASSWORD_PATH },
    ],
    ['una sesión que vence, sin petición de por medio', null],
  ])('no avisa cuando se borra %s', async (_caso, context) => {
    const { after, signedOut, sessionRevoked } = setup();

    await after({ id: 's1', userId: 'u1' }, context);

    expect(signedOut).not.toHaveBeenCalled();
    expect(sessionRevoked).not.toHaveBeenCalled();
  });

  it.each([
    ['las demás sesiones', REVOKE_OTHER_SESSIONS_PATH, 'others'],
    ['todas las sesiones', REVOKE_SESSIONS_PATH, 'all'],
  ])(
    'avisa de cada sesión que se cierra al revocar %s, con de quién era, el alcance y desde dónde',
    async (_caso, path, scope) => {
      const { after, signedOut, sessionRevoked } = setup();

      await after({ id: 's1', userId: 'u1' }, { path, request });

      expect(sessionRevoked).toHaveBeenCalledExactlyOnceWith('u1', scope, {
        ip: '203.0.113.7',
        userAgent: 'Fiaro/1.0',
      });
      expect(signedOut).not.toHaveBeenCalled();
    },
  );

  it('cerrar sesión no cuenta como revocar', async () => {
    const { after, sessionRevoked } = setup();

    await after({ id: 's1', userId: 'u1' }, { path: SIGN_OUT_PATH, request });

    expect(sessionRevoked).not.toHaveBeenCalled();
  });
});
