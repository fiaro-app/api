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
      .send({ contentType: 'image/png' });

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
      .send({ contentType: 'application/pdf' });

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
      .send({ contentType: 'image/png' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sin sesión responde 401', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await app.http
      .post('/lender/logo-upload-url')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .send({ contentType: 'image/png' });

    expect(response.status).toBe(401);
  });
});
