import { describe, expect, it } from 'vitest';
import { AuthErrorSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import { StatusResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';
import {
  APP_ORIGIN,
  login,
  nextIp,
  PASSWORD,
  PHONE,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';
import { captureLogs } from '@test/support/log-capture.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const revoke = (
  app: TestApp,
  route: 'revoke-other-sessions' | 'revoke-sessions',
  cookie?: string,
  origin = APP_ORIGIN,
) => {
  const request = app.http
    .post(`/auth/${route}`)
    .set('X-Forwarded-For', nextIp())
    .set('Origin', origin);
  return cookie === undefined ? request : request.set('Cookie', cookie);
};

describe('POST /auth/revoke-other-sessions', () => {
  it('cierra las demás sesiones de la persona y deja la de la cookie', async () => {
    const app = await startWithUser();
    const current = await login(app);
    const phone = await login(app);
    const tablet = await login(app);

    const response = await revoke(app, 'revoke-other-sessions', current);

    expect(response.status).toBe(200);
    expect(StatusResponseSchema.parse(response.body)).toEqual({ status: true });
    expect((await whoami(app, current)).status).toBe(200);
    expect((await whoami(app, phone)).status).toBe(401);
    expect((await whoami(app, tablet)).status).toBe(401);
    expect(await app.prisma.session.count()).toBe(1);
  });

  it('no toca las sesiones de otras personas', async () => {
    const app = await startWithUser();
    await app.createUser({
      phone: '+573109998877',
      fullName: 'Luis Gómez',
      password: 'otra-clave-larga-1',
    });
    const luis = (
      await signIn(app, {
        phone: '+573109998877',
        password: 'otra-clave-larga-1',
      })
    ).headers['set-cookie'] as unknown as string[];
    const luisCookie = luis.map((cookie) => cookie.split(';')[0]).join('; ');
    const ana = await login(app);
    await login(app);

    await revoke(app, 'revoke-other-sessions', ana);

    expect((await whoami(app, luisCookie)).status).toBe(200);
  });

  it('sin sesión responde 401 y con un origen ajeno 403', async () => {
    const app = await startWithUser();
    const cookie = await login(app);

    const anonymous = await revoke(app, 'revoke-other-sessions');
    const foreign = await revoke(
      app,
      'revoke-other-sessions',
      cookie,
      'https://sitio-ajeno.example',
    );

    expect(anonymous.status).toBe(401);
    expect(AuthErrorSchema.parse(anonymous.body).code).toBe('UNAUTHORIZED');
    expect(foreign.status).toBe(403);
    expect(AuthErrorSchema.parse(foreign.body).code).toBe('INVALID_ORIGIN');
  });

  it('audita cada sesión cerrada, con su alcance y la misma petición', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { LOG_LEVEL: 'info' },
      logDestination: logs.destination,
    });
    const current = await login(app);
    await login(app);
    await login(app);

    const response = await revoke(app, 'revoke-other-sessions', current);

    const events = logs
      .entries()
      .filter((entry) => entry.event === 'auth.session.revoked');
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event).toMatchObject({
        audit: true,
        outcome: 'SUCCESS',
        details: { scope: 'others' },
        requestId: response.headers['x-request-id'],
        userId: expect.any(String),
      });
    }
  });
});

describe('POST /auth/revoke-sessions', () => {
  it('cierra todas las sesiones de la persona, la de la cookie también', async () => {
    const app = await startWithUser();
    const current = await login(app);
    const other = await login(app);

    const response = await revoke(app, 'revoke-sessions', current);

    expect(response.status).toBe(200);
    expect(StatusResponseSchema.parse(response.body)).toEqual({ status: true });
    expect((await whoami(app, current)).status).toBe(401);
    expect((await whoami(app, other)).status).toBe(401);
    expect(await app.prisma.session.count()).toBe(0);
  });

  it('después se puede volver a iniciar sesión: la cuenta sigue igual', async () => {
    const app = await startWithUser();
    const current = await login(app);
    await revoke(app, 'revoke-sessions', current);

    const again = await signIn(app);

    expect(again.status).toBe(200);
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { phone: PHONE },
    });
    expect(user.mustChangePassword).toBe(false);
    expect(PASSWORD).toBeDefined();
  });

  it('sin sesión responde 401', async () => {
    const app = await startWithUser();

    const response = await revoke(app, 'revoke-sessions');

    expect(response.status).toBe(401);
  });

  it('audita cada sesión cerrada con el alcance all', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { LOG_LEVEL: 'info' },
      logDestination: logs.destination,
    });
    const current = await login(app);
    await login(app);

    await revoke(app, 'revoke-sessions', current);

    const events = logs
      .entries()
      .filter((entry) => entry.event === 'auth.session.revoked');
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.details)).toEqual([
      { scope: 'all' },
      { scope: 'all' },
    ]);
  });
});
