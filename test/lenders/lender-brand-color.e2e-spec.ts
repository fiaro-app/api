import { afterEach, describe, expect, it } from 'vitest';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

function patchLender(testApp: TestApp, cookie: string, body: object) {
  return testApp.http
    .patch('/lender')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(body);
}

describe('PATCH /lender { brandColor }', () => {
  it('un negocio nuevo no tiene color de marca', async () => {
    app = await startTestApp(START);
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const response = await app.http
      .get('/lender')
      .set(HEADERS)
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.brandColor).toBeNull();
  });

  it('guarda el color en mayúsculas y lo devuelve en GET /lender', async () => {
    app = await startTestApp(START);
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const patched = await patchLender(app, ownerCookie, {
      brandColor: '#ff8800',
    });
    const read = await app.http
      .get('/lender')
      .set(HEADERS)
      .set('Cookie', ownerCookie);

    expect(patched.status).toBe(200);
    expect(patched.body.brandColor).toBe('#FF8800');
    expect(read.body.brandColor).toBe('#FF8800');
  });

  it('null vuelve al color de Fiaro, y un PATCH sin brandColor lo conserva', async () => {
    app = await startTestApp(START);
    const { ownerCookie } = await seedBusinessWithCollector(app);
    await patchLender(app, ownerCookie, { brandColor: '#112233' });

    const renamed = await patchLender(app, ownerCookie, {
      name: 'Negocio con otro nombre',
    });
    const cleared = await patchLender(app, ownerCookie, { brandColor: null });

    expect(renamed.body.brandColor).toBe('#112233');
    expect(cleared.body.brandColor).toBeNull();
  });

  it.each(['naranja', '#F80', 'FF8800'])(
    'responde 400 con %j',
    async (brandColor) => {
      app = await startTestApp(START);
      const { ownerCookie } = await seedBusinessWithCollector(app);

      const response = await patchLender(app, ownerCookie, { brandColor });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
    },
  );

  it('responde 403 a un cobrador', async () => {
    app = await startTestApp(START);
    const { collectorCookie } = await seedBusinessWithCollector(app);

    const response = await patchLender(app, collectorCookie, {
      brandColor: '#112233',
    });

    expect(response.status).toBe(403);
  });
});
