import { afterEach, describe, expect, it } from 'vitest';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Redis de las pruebas: el de CI, o el que se pase en `REDIS_URL` (nunca se asume uno). */
const REDIS_URL = process.env.REDIS_URL;

function clients(testApp: TestApp, cookie: string) {
  return httpQuery(testApp.http, '/clients')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({});
}

describe.skipIf(REDIS_URL === undefined)('Caché de lecturas (D-118)', () => {
  it('una escritura del prestamista invalida lo guardado: quien escribe ve su cambio', async () => {
    app = await startTestApp({
      env: {
        CORS_ORIGINS: HEADERS.Origin,
        REDIS_URL,
        QUEUE_PREFIX: `cache-e2e-${String(Date.now())}`,
      },
    });
    const business = await seedBusinessWithCollector(app);

    const before = await clients(app, business.ownerCookie);
    const created = await app.http
      .post('/clients')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        nationalId: '90807060',
        fullName: 'Cliente de la Caché',
        occupation: 'Tendero',
        phone: '+573001112233',
        address: 'Calle 1 # 2-3',
      });
    const after = await clients(app, business.ownerCookie);

    expect(before.status).toBe(200);
    expect(created.status).toBe(201);
    const totalBefore = (before.body as { meta: { total: number } }).meta.total;
    expect(after.body.meta.total).toBe(totalBefore + 1);
  });

  it('con Redis caído las lecturas y escrituras siguen funcionando', async () => {
    app = await startTestApp({
      env: {
        CORS_ORIGINS: HEADERS.Origin,
        CACHE_REDIS_URL: 'redis://127.0.0.1:1',
      },
    });
    const business = await seedBusinessWithCollector(app);

    const first = await clients(app, business.ownerCookie);
    const second = await clients(app, business.ownerCookie);

    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });
});
