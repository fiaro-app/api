import { Logger } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  cookieOf,
  nextIp,
  PASSWORD,
  signIn,
  useAuthApp,
  whoami,
} from '@test/support/auth-flow.js';
import { captureLogs } from '@test/support/log-capture.js';

const { startWithUser } = useAuthApp();

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function startLogging() {
  const logs = captureLogs();
  const app = await startWithUser({
    env: { LOG_LEVEL: 'info' },
    logDestination: logs.destination,
  });
  const requests = () =>
    logs.entries().filter((entry) => entry.msg === 'request completed');
  return { app, logs, requests };
}

describe('logs de las peticiones', () => {
  it('cada petición deja una línea JSON con método, ruta, estado y tiempo', async () => {
    const { app, requests } = await startLogging();

    await app.http.get('/probe/open').set('X-Forwarded-For', nextIp());

    const [entry] = requests();
    expect(entry).toMatchObject({
      level: 'info',
      service: 'fiaro-api',
      route: '/probe/open',
      req: { method: 'GET', path: '/probe/open' },
      res: { statusCode: 200 },
    });
    expect(entry?.responseTime).toEqual(expect.any(Number));
    expect(entry?.time).toEqual(expect.any(String));
  });

  it('un rechazo del cliente (401) queda como warn, con la ruta que se pidió', async () => {
    const { app, requests } = await startLogging();

    await signIn(app, { password: 'no-es-la-contraseña' });

    expect(requests()[0]).toMatchObject({
      level: 'warn',
      req: { method: 'POST', path: '/auth/sign-in/phone-number' },
      res: { statusCode: 401 },
    });
  });

  it('una ruta que no existe (404) queda como warn y sin plantilla de ruta', async () => {
    const { app, requests } = await startLogging();

    await app.http.get('/no-existe');

    const [entry] = requests();
    expect(entry).toMatchObject({
      level: 'warn',
      req: { path: '/no-existe' },
      res: { statusCode: 404 },
    });
    expect(entry).not.toHaveProperty('route');
  });

  it('una petición con sesión dice qué persona la hizo', async () => {
    const { app, requests } = await startLogging();
    const signedIn = await signIn(app);
    const { id } = await app.prisma.user.findFirstOrThrow({
      select: { id: true },
    });

    await whoami(app, cookieOf(signedIn));

    const entry = requests().find(
      (e) => (e.req as { path: string }).path === '/probe/whoami',
    );
    expect(entry).toMatchObject({ userId: id, res: { statusCode: 200 } });
  });

  it('una petición sin sesión no dice ninguna persona', async () => {
    const { app, requests } = await startLogging();

    await app.http.get('/probe/open').set('X-Forwarded-For', nextIp());

    expect(requests()[0]).not.toHaveProperty('userId');
  });

  describe('lo que nunca se escribe', () => {
    it('la contraseña, la cookie de sesión ni el token', async () => {
      const { app, logs } = await startLogging();
      const signedIn = await signIn(app);
      const cookie = cookieOf(signedIn);
      const sessionToken = /fiaro\.session_token=([^;]+)/.exec(cookie)?.[1];

      await whoami(app, cookie);

      expect(sessionToken).toEqual(expect.any(String));
      const text = logs.text();
      expect(text).not.toContain(PASSWORD);
      expect(text).not.toContain(sessionToken);
      expect(text.toLowerCase()).not.toContain('set-cookie');
    });

    it('la cadena de consulta de la URL', async () => {
      const { app, logs } = await startLogging();

      await app.http
        .get('/probe/open?token=secreto-en-la-url')
        .set('X-Forwarded-For', nextIp());

      expect(logs.text()).not.toContain('secreto-en-la-url');
    });
  });

  describe('identificador de la petición', () => {
    it('se crea uno, se devuelve en X-Request-Id y es el mismo del log', async () => {
      const { app, requests } = await startLogging();

      const response = await app.http
        .get('/probe/open')
        .set('X-Forwarded-For', nextIp());

      const id = response.headers['x-request-id'];
      expect(id).toMatch(UUID);
      expect(requests()[0]).toMatchObject({ req: { id }, requestId: id });
    });

    it('se respeta el que envía el cliente si es razonable', async () => {
      const { app, requests } = await startLogging();

      const response = await app.http
        .get('/probe/open')
        .set('X-Forwarded-For', nextIp())
        .set('X-Request-Id', 'app-movil-1234567890');

      expect(response.headers['x-request-id']).toBe('app-movil-1234567890');
      expect(requests()[0]).toMatchObject({
        req: { id: 'app-movil-1234567890' },
      });
    });

    it('se reemplaza el que trae caracteres que no deben llegar al log', async () => {
      const { app, requests } = await startLogging();

      const response = await app.http
        .get('/probe/open')
        .set('X-Forwarded-For', nextIp())
        .set('X-Request-Id', 'x'.repeat(200));

      expect(response.headers['x-request-id']).toMatch(UUID);
      expect(requests()[0]).toMatchObject({
        req: { id: response.headers['x-request-id'] },
      });
    });
  });

  it('los avisos de Nest también salen en JSON, con su contexto', async () => {
    const { logs } = await startLogging();

    new Logger('Sonda').warn('aviso de prueba');

    expect(logs.entries()).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        msg: 'aviso de prueba',
        context: 'Sonda',
      }),
    );
  });

  it('con LOG_LEVEL=error no se escribe el registro de las peticiones que salen bien', async () => {
    const logs = captureLogs();
    const app = await startWithUser({
      env: { LOG_LEVEL: 'error' },
      logDestination: logs.destination,
    });

    await app.http.get('/probe/open').set('X-Forwarded-For', nextIp());

    expect(logs.entries()).toEqual([]);
  });
});
