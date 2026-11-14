import { v7 as uuidv7 } from 'uuid';
import { describe, expect, it } from 'vitest';
import { nextIp, signIn, useAuthApp } from '@test/support/auth-flow.js';
import { captureLogs } from '@test/support/log-capture.js';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { startTestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

const SESSION = '0198f8e0-1111-7222-8333-444455556666';
const TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';

async function startLogging() {
  const logs = captureLogs();
  const app = await startWithUser({
    env: { LOG_LEVEL: 'info' },
    logDestination: logs.destination,
  });
  const requests = () =>
    logs.entries().filter((entry) => entry.msg === 'request completed');
  return { app, requests };
}

describe('el recorrido de una persona en el log (D-135)', () => {
  it('cada línea lleva la sesión, la pantalla y la traza que envió la app', async () => {
    const { app, requests } = await startLogging();

    await app.http
      .get('/probe/open')
      .set('X-Forwarded-For', nextIp())
      .set('X-Session-Id', SESSION)
      .set('X-Client-Screen', '/visit/[loanId]')
      .set('traceparent', `00-${TRACE}-00f067aa0ba902b7-01`);

    expect(requests()[0]).toMatchObject({
      sessionId: SESSION,
      screen: '/visit/[loanId]',
      traceId: TRACE,
      spanId: expect.stringMatching(/^[0-9a-f]{16}$/),
    });
  });

  it('varias peticiones de la misma sesión se pueden seguir por su sessionId, en orden', async () => {
    const { app, requests } = await startLogging();
    const headers = { 'X-Session-Id': SESSION };

    await app.http
      .get('/probe/open')
      .set('X-Forwarded-For', nextIp())
      .set({ ...headers, 'X-Client-Screen': '/login' });
    await app.http
      .get('/probe/open')
      .set('X-Forwarded-For', nextIp())
      .set({ ...headers, 'X-Client-Screen': '/' });
    await app.http
      .get('/probe/open')
      .set('X-Forwarded-For', nextIp())
      .set('X-Session-Id', uuidv7());

    const journey = requests().filter((entry) => entry.sessionId === SESSION);
    expect(journey.map((entry) => entry.screen)).toEqual(['/login', '/']);
  });

  it('lo que envía la app y no cumple su forma exacta se ignora: no llega al log ni falla la petición', async () => {
    const { app, requests } = await startLogging();

    const response = await app.http
      .get('/probe/open')
      .set('X-Forwarded-For', nextIp())
      .set('X-Session-Id', 'no-es-un-uuid')
      .set('X-Client-Screen', '/<script>');

    expect(response.status).toBe(200);
    expect(requests()[0]?.sessionId).toBeUndefined();
    expect(requests()[0]?.screen).toBeUndefined();
    expect(requests()[0]?.traceId).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('códigos únicos de error (D-134)', () => {
  it('la respuesta lleva el errorCode y el requestId, y el log lleva el código con qué mirar', async () => {
    const { app, requests } = await startLogging();

    const response = await signIn(app, { password: 'no-es-la-contraseña' });

    expect(response.status).toBe(401);
    const body = response.body as Record<string, unknown>;
    expect(body.errorCode).toMatch(/^[A-Z]\d{3}[A-Z]$/);
    expect(body.requestId).toBe(response.headers['x-request-id']);
    const entry = requests()[0];
    expect(entry).toMatchObject({
      errorCode: body.errorCode,
      errorHint: expect.any(String),
      errorTitle: expect.any(String),
    });
  });

  it('un error de negocio distingue su código único aunque comparta `code` con otros', async () => {
    const app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    try {
      const business = await seedBusinessWithCollector(app);
      const ask = (path: string) =>
        app.http
          .get(path)
          .set(HEADERS)
          .set('X-Forwarded-For', nextIp())
          .set('Cookie', business.ownerCookie);
      const id = '00000000-0000-7000-8000-000000000000';

      const loan = await ask(`/loans/${id}`);
      const client = await ask(`/clients/${id}`);

      expect(loan.body).toMatchObject({
        code: 'NOT_FOUND',
        errorCode: 'L003A',
      });
      expect(client.body).toMatchObject({
        code: 'NOT_FOUND',
        errorCode: 'C002A',
      });
      expect((loan.body as { debug: { hint: string } }).debug.hint).toMatch(
        /Id viejo/,
      );
    } finally {
      await app.close();
    }
  });
});
