import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ORIGIN,
  statusesOf,
  useSecurityApp,
} from '@test/support/security-app.js';

const startApp = useSecurityApp();

describe('rate limit', () => {
  const limit = 3;
  const throttle = { ttlMs: 60_000, limit };
  const withinLimit = Array<number>(limit).fill(200);

  it('bloquea con 429 y Retry-After al pasar el límite', async () => {
    const api = await startApp({ throttle });

    for (let i = 0; i < limit; i++) {
      await api.get('/probe/ping').expect(200);
    }
    const blocked = await api.get('/probe/ping').expect(429);

    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.message).toContain('Demasiadas solicitudes');
  });

  it('informa el límite y lo que queda en cada respuesta', async () => {
    const api = await startApp({ throttle });

    const first = await api.get('/probe/ping').expect(200);
    const second = await api.get('/probe/ping').expect(200);

    expect(first.headers['x-ratelimit-limit']).toBe('3');
    expect(first.headers['x-ratelimit-remaining']).toBe('2');
    expect(second.headers['x-ratelimit-remaining']).toBe('1');
  });

  it('cuenta por ruta: agotar una no bloquea las demás', async () => {
    const api = await startApp({ throttle });

    const pings = await statusesOf(limit + 1, () => api.get('/probe/ping'));
    const other = await api.get('/probe/other');

    expect(pings).toEqual([...withinLimit, 429]);
    expect(other.status).toBe(200);
  });

  it('no cuenta los preflight de CORS', async () => {
    const api = await startApp({ throttle });

    const preflights = await statusesOf(limit * 2, () =>
      api
        .options('/probe/search')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'QUERY'),
    );
    const pings = await statusesOf(limit + 1, () => api.get('/probe/ping'));

    expect(preflights).toEqual(Array<number>(limit * 2).fill(204));
    expect(pings).toEqual([...withinLimit, 429]);
  });

  it('sin proxy de confianza ignora X-Forwarded-For, que cualquiera puede falsificar', async () => {
    const api = await startApp({ throttle, trustProxy: 0 });

    const statuses = await statusesOf(limit + 1, (i) =>
      api
        .get('/probe/ping')
        .set('X-Forwarded-For', `203.0.113.${String(i + 1)}`),
    );

    expect(statuses).toEqual([...withinLimit, 429]);
  });

  it('detrás de un proxy de confianza cuenta a cada cliente por separado', async () => {
    const api = await startApp({ throttle, trustProxy: 1 });

    const fromClient = (ip: string) =>
      api.get('/probe/ping').set('X-Forwarded-For', ip);

    const firstClient = await statusesOf(limit + 1, () =>
      fromClient('203.0.113.1'),
    );
    const secondClient = await fromClient('203.0.113.2');

    expect(firstClient).toEqual([...withinLimit, 429]);
    expect(secondClient.status).toBe(200);
  });
});
