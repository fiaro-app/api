import { describe, expect, it } from 'vitest';
import { PHONE, nextIp, signIn, useAuthApp } from '@test/support/auth-flow.js';
import type { TestApp } from '@test/support/test-app.js';

const { startWithUser } = useAuthApp();

describe('rate limit', () => {
  const attempts = async (app: TestApp, count: number, ip: string) => {
    const statuses: number[] = [];
    for (let i = 0; i < count; i++) {
      statuses.push(
        (await signIn(app, { password: 'incorrecta-a-proposito', ip })).status,
      );
    }
    return statuses;
  };

  it('el sexto intento en un minuto desde la misma IP responde 429 con Retry-After', async () => {
    const app = await startWithUser();
    const ip = nextIp();

    const statuses = await attempts(app, 5, ip);
    const blocked = await signIn(app, { ip });

    expect(statuses).toEqual([401, 401, 401, 401, 401]);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
    });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['set-cookie']).toBeUndefined();
  });

  it('otra IP no comparte el contador', async () => {
    const app = await startWithUser();
    const blockedIp = nextIp();
    await attempts(app, 6, blockedIp);

    const other = await signIn(app, { ip: nextIp() });

    expect(other.status).toBe(200);
  });

  it('sin proxy de confianza no se puede evitar el límite falsificando la IP', async () => {
    const app = await startWithUser({ env: { TRUST_PROXY: '0' } });
    const spoofed = async (ip: string) =>
      (
        await app.http
          .post('/auth/sign-in/phone-number')
          .set('X-Forwarded-For', ip)
          .set('X-Fiaro-Client-Ip', ip)
          .send({ phoneNumber: PHONE, password: 'incorrecta-a-proposito' })
      ).status;

    const statuses: number[] = [];
    for (let i = 1; i <= 6; i++) {
      statuses.push(await spoofed(`203.0.113.${String(i)}`));
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });
});

describe('el rate limit general de Nest también protege las rutas de autenticación', () => {
  it('pasado el límite responde 429 con Retry-After, sin llegar a better-auth', async () => {
    const app = await startWithUser({
      overrides: { throttle: { ttlMs: 60_000, limit: 3 } },
    });
    const ip = nextIp();
    const statuses: number[] = [];

    for (let i = 0; i < 4; i++) {
      statuses.push(
        (await app.http.get('/auth/get-session').set('X-Forwarded-For', ip))
          .status,
      );
    }

    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
