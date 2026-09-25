import { describe, expect, it, vi } from 'vitest';
import {
  CHANGE_PASSWORD_PATH,
  SIGN_OUT_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { createAuthDatabaseHooks } from '@/modules/auth/infrastructure/better-auth/auth-database-hooks.js';

const request = new Request('https://api.fiaro.co/auth/sign-out', {
  headers: { 'x-fiaro-client-ip': '203.0.113.7', 'user-agent': 'Fiaro/1.0' },
});

function setup() {
  const signedOut = vi.fn();
  const hooks = createAuthDatabaseHooks({
    signedOut,
  } as unknown as AuthAuditor);
  const after = hooks.session?.delete?.after as (
    session: object,
    context: object | null,
  ) => Promise<void>;
  return { signedOut, after };
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
    const { after, signedOut } = setup();

    await after({ id: 's1', userId: 'u1' }, context);

    expect(signedOut).not.toHaveBeenCalled();
  });
});
