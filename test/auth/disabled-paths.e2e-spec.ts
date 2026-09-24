import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { AUTH_BASE_PATH } from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';
import { DISABLED_PATHS } from '@/modules/auth/infrastructure/better-auth/auth-plugins.js';
import { PHONE, useAuthApp } from '@test/support/auth-flow.js';
import { testEnvSource } from '@test/support/test-env.js';

const { startWithUser } = useAuthApp();

/**
 * La API no publica estas rutas (el controller solo reenvía cuatro), pero better-auth también las
 * tiene apagadas: aunque un cambio futuro reenviara más rutas, el código por SMS seguiría sin existir.
 */
describe('rutas de better-auth apagadas', () => {
  const { baseUrl } = loadEnv(testEnvSource()).auth;

  const callBetterAuth = async (
    path: string,
    init: RequestInit,
  ): Promise<Response> => {
    const app = await startWithUser();
    const auth = app.app.get<Auth>(BETTER_AUTH, { strict: false });
    return auth.handler(
      new Request(`${baseUrl}${AUTH_BASE_PATH}${path}`, {
        headers: { 'content-type': 'application/json', origin: baseUrl },
        ...init,
      }),
    );
  };

  it.each(DISABLED_PATHS)(
    '%s responde 404 aunque se le pida directamente a better-auth',
    async (path) => {
      const response = await callBetterAuth(path, {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: PHONE, code: '123456' }),
      });

      expect(response.status).toBe(404);
    },
  );

  it('una ruta que sí está encendida responde con normalidad, así el 404 no es un error de la prueba', async () => {
    const response = await callBetterAuth('/get-session', { method: 'GET' });

    expect(response.status).toBe(200);
  });
});
