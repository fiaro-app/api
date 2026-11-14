import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
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

describe('POST /lender/logo-upload-url', () => {
  it('devuelve una URL firmada y la URL pública, con rol OWNER', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post('/lender/logo-upload-url')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.ownerCookie)
      .send({ contentType: 'image/png', sizeBytes: 48_000 });

    expect(response.status).toBe(200);
    const body = response.body as {
      uploadUrl: string;
      publicUrl: string;
      expiresAt: string;
    };
    expect(body.uploadUrl).toMatch(
      /^http:\/\/localhost:8333\/fiaro-dev\/logos\//,
    );
    expect(body.uploadUrl).toContain('.png');
    expect(body.uploadUrl).toContain(
      'X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost',
    );
    expect(body.publicUrl).toMatch(
      /^http:\/\/localhost:8333\/fiaro-dev\/logos\/.+\.png$/,
    );
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rechaza un contentType que no sea imagen PNG o JPEG', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post('/lender/logo-upload-url')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.ownerCookie)
      .send({ contentType: 'application/pdf', sizeBytes: 48_000 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('con solo el rol COLLECTOR responde 403', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post('/lender/logo-upload-url')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.collectorCookie)
      .send({ contentType: 'image/png', sizeBytes: 48_000 });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sin sesión responde 401', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await app.http
      .post('/lender/logo-upload-url')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .send({ contentType: 'image/png', sizeBytes: 48_000 });

    expect(response.status).toBe(401);
  });

  it('rechaza un peso de más de 2 MB o sin peso', async () => {
    const testApp = await startTestApp({
      env: { CORS_ORIGINS: HEADERS.Origin },
    });
    app = testApp;
    const business = await seedBusinessWithCollector(testApp);
    const ask = (body: object) =>
      testApp.http
        .post('/lender/logo-upload-url')
        .set(HEADERS)
        .set('X-Forwarded-For', nextIp())
        .set('Cookie', business.ownerCookie)
        .send(body);

    expect((await ask({ contentType: 'image/png' })).status).toBe(400);
    expect(
      (await ask({ contentType: 'image/png', sizeBytes: 2 * 1024 * 1024 + 1 }))
        .status,
    ).toBe(400);
  });
});

describe('PATCH /lender { logoUrl }', () => {
  it('solo acepta logos subidos con la URL firmada del negocio: cualquier otra URL se rechaza', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    for (const logoUrl of [
      'https://evil.example/logo.png',
      'http://localhost:8333/fiaro-dev/logos/otro/archivo.png',
      'javascript:alert(1)',
    ]) {
      const response = await app.http
        .patch('/lender')
        .set(HEADERS)
        .set('X-Forwarded-For', nextIp())
        .set('Cookie', business.ownerCookie)
        .send({ logoUrl });

      expect([400]).toContain(response.status);
      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    }
  });
});
