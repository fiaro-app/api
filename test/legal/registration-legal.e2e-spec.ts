import { afterEach, describe, expect, it } from 'vitest';
import { LEGAL_ACCEPTANCE } from '@test/support/legal-acceptance.js';
import { HEADERS } from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const BODY = {
  phone: '+573007090777',
  fullName: 'Dueña Legal',
  password: 'contraseña-de-prueba-1',
  nationalId: '70907771',
  businessName: 'Negocio legal',
};

const register = (testApp: TestApp, extra: Record<string, unknown>) =>
  testApp.http
    .post('/register')
    .set(HEADERS)
    .send({ ...BODY, ...extra });

describe('POST /register — aceptaciones legales', () => {
  it('guarda lo aceptado con su versión, IP y dispositivo', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await register(app, {
      ...LEGAL_ACCEPTANCE,
      marketingConsent: true,
    }).set('User-Agent', 'e2e-agent');

    expect(response.status).toBe(201);
    const rows = await app.prisma.legalAcceptance.findMany({
      where: { userId: (response.body as { user: { id: string } }).user.id },
      orderBy: { document: 'asc' },
    });
    expect(rows.map((row) => row.document).sort()).toEqual([
      'DATA_RESPONSIBILITY',
      'MARKETING',
      'PRIVACY',
      'TERMS',
    ]);
    expect(
      rows.every((row) => row.version === LEGAL_ACCEPTANCE.legalVersion),
    ).toBe(true);
    expect(rows.every((row) => row.userAgent === 'e2e-agent')).toBe(true);
  });

  it('sin marcar los términos no crea la cuenta', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await register(app, {
      ...LEGAL_ACCEPTANCE,
      acceptedTerms: false,
    });

    expect(response.status).toBe(400);
    expect(await app.prisma.user.count({ where: { phone: BODY.phone } })).toBe(
      0,
    );
  });

  it('con una versión vieja responde P930V y no crea la cuenta', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await register(app, {
      ...LEGAL_ACCEPTANCE,
      legalVersion: '2020-01-01',
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('P930V');
    expect(await app.prisma.user.count({ where: { phone: BODY.phone } })).toBe(
      0,
    );
  });
});
