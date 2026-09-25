import { describe, expect, it } from 'vitest';
import {
  APP_ORIGIN,
  login,
  nextIp,
  PASSWORD,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';
import { captureLogs } from '@test/support/log-capture.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const changePassword = (app: TestApp, cookie: string, newPassword: unknown) =>
  app.http
    .post('/auth/change-password')
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .set('Origin', APP_ORIGIN)
    .send({ currentPassword: PASSWORD, newPassword });

const WEAK_MESSAGE =
  'La contraseña es demasiado fácil de adivinar. Evita las más usadas, los números seguidos o repetidos, y tu celular o tu cédula.';

describe('contraseña nueva demasiado fácil de adivinar', () => {
  it.each([
    ['una de las más usadas', 'password123'],
    ['una de las más usadas en leet', 'P@ssw0rd2026'],
    ['un patrón', 'abcdefghij'],
    ['una que lleva el celular de la persona', 'ana-3001234567-x'],
  ])(
    'rechaza con 400 PASSWORD_TOO_WEAK %s y no cambia nada',
    async (_caso, newPassword) => {
      const app = await startWithUser();
      const cookie = await login(app);
      const other = await login(app);

      const change = await changePassword(app, cookie, newPassword);

      expect(change.status).toBe(400);
      expect(change.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_TOO_WEAK',
        message: WEAK_MESSAGE,
        issues: null,
      });
      expect(change.headers['content-language']).toBe('es');
      expect((await whoami(app, other)).status).toBe(200);
      expect((await signIn(app)).status).toBe(200);
      expect((await signIn(app, { password: newPassword })).status).toBe(401);
    },
  );

  it('acepta una contraseña que no es fácil de adivinar', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const change = await changePassword(
      app,
      cookie,
      'la-tienda-abre-a-las-seis',
    );

    expect(change.status).toBe(200);
    expect(
      (await signIn(app, { password: 'la-tienda-abre-a-las-seis' })).status,
    ).toBe(200);
  });

  it('una contraseña nueva demasiado corta la sigue rechazando la validación de longitud, no esta regla', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const change = await changePassword(app, cookie, '1234');

    expect(change.status).toBe(400);
    expect(change.body.code).toBe('VALIDATION_FAILED');
  });

  it('sin sesión responde 401 aunque la contraseña sea débil', async () => {
    const app = await startWithUser();

    const change = await app.http
      .post('/auth/change-password')
      .set('X-Forwarded-For', nextIp())
      .set('Origin', APP_ORIGIN)
      .send({ currentPassword: PASSWORD, newPassword: 'password123' });

    expect(change.status).toBe(401);
  });

  it('lo audita como un cambio de contraseña fallido, con el motivo y sin la contraseña', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { LOG_LEVEL: 'info' },
      logDestination: logs.destination,
    });
    const cookie = await login(app);

    await changePassword(app, cookie, 'password123');

    const events = logs
      .entries()
      .filter((entry) => entry.event === 'auth.password.change_failed');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      audit: true,
      outcome: 'FAILURE',
      reason: 'PASSWORD_TOO_WEAK',
      phone: { last4: '4567' },
    });
    expect(logs.text()).not.toContain('password123');
  });
});
