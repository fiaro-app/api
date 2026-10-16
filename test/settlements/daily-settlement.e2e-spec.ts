import { LEGAL_ACCEPTANCE } from '@test/support/legal-acceptance.js';
import type { Response } from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;
let seedSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
function nextIdentity(): { phone: string; nationalId: string } {
  seedSeq += 1;
  const suffix = String(seedSeq).padStart(5, '0');
  return { phone: `+5730030${suffix}`, nationalId: `3${suffix}` };
}

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

/** Registra un negocio nuevo (el dueño nace con OWNER, LENDER y COLLECTOR, D-78). */
async function seedBusiness(testApp: TestApp): Promise<{ cookie: string }> {
  const { phone, nationalId } = nextIdentity();
  const registerResponse = await testApp.http
    .post('/register')
    .set(HEADERS)
    .send({
      ...LEGAL_ACCEPTANCE,
      phone,
      fullName: 'Ana Prueba',
      password: 'contraseña-de-prueba-1',
      nationalId,
      businessName: 'Negocio de prueba',
    });
  expect(registerResponse.status).toBe(201);

  const signInResponse = await signIn(testApp, {
    phone,
    password: 'contraseña-de-prueba-1',
  });
  expect(signInResponse.status).toBe(200);
  return { cookie: cookieOf(signInResponse) };
}

async function getSettlement(
  testApp: TestApp,
  id: string,
  cookie: string,
): Promise<Response> {
  return testApp.http
    .get(`/daily-settlements/${id}`)
    .set('Cookie', cookie)
    .set('X-Forwarded-For', nextIp());
}

describe('POST /daily-settlements', () => {
  it('exige collectorNote cuando lo cobrado difiere de lo esperado', async () => {
    app = await startTestApp();
    const { cookie } = await seedBusiness(app);

    const withoutNote = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 100_000,
        collectedCash: 60_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    expect(withoutNote.status).toBe(400);
    expect(withoutNote.body.code).toBe('VALIDATION_FAILED');

    const withNote = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 100_000,
        collectedCash: 60_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        collectorNote: 'Un cliente no pagó.',
      });

    expect(withNote.status).toBe(200);
    expect(withNote.body).toMatchObject({
      expectedAmount: 100_000,
      collectedAmount: 60_000,
      collectedByMethod: { CASH: 60_000, NEQUI: 0, TRANSFER: 0 },
      status: 'PENDING',
      collectorNote: 'Un cliente no pagó.',
    });
  });
});

describe('POST /daily-settlements/:id/approve', () => {
  it('lo deja APPROVED, y aprobarlo otra vez responde 409', async () => {
    app = await startTestApp();
    const { cookie } = await seedBusiness(app);
    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;

    const approved = await app.http
      .post(`/daily-settlements/${settlementId}/approve`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({});
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('APPROVED');

    const secondApproval = await app.http
      .post(`/daily-settlements/${settlementId}/approve`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({});
    expect(secondApproval.status).toBe(409);
    expect(secondApproval.body.code).toBe('CONFLICT');
  });
});

describe('POST /daily-settlements/:id/reject', () => {
  it('es informativo: queda REJECTED con el comentario', async () => {
    app = await startTestApp();
    const { cookie } = await seedBusiness(app);
    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;

    const rejected = await app.http
      .post(`/daily-settlements/${settlementId}/reject`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reviewNote: 'Falta soportar la diferencia.' });

    expect(rejected.status).toBe(200);
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      reviewNote: 'Falta soportar la diferencia.',
    });
  });
});

describe('reenvío del cuadre (D-36)', () => {
  it('actualiza la misma fila y la devuelve a PENDING, limpiando la revisión', async () => {
    app = await startTestApp();
    const { cookie } = await seedBusiness(app);
    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;
    await app.http
      .post(`/daily-settlements/${settlementId}/reject`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reviewNote: 'Revisa el efectivo.' });

    const resent = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 45_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        collectorNote: 'Hacía falta un recibo.',
      });

    expect(resent.status).toBe(200);
    expect(resent.body.id).toBe(settlementId);
    expect(resent.body).toMatchObject({
      status: 'PENDING',
      collectedAmount: 45_000,
      collectorNote: 'Hacía falta un recibo.',
      reviewNote: null,
      reviewedByMembershipId: null,
      reviewedAt: null,
    });
  });
});

describe('QUERY /daily-settlements', () => {
  it('lista los cuadres del prestamista de la sesión, filtrados por estado', async () => {
    app = await startTestApp();
    const { cookie } = await seedBusiness(app);
    await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });

    const page = await httpQuery(app.http, '/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ status: 'PENDING' });

    expect(page.status).toBe(200);
    expect(page.body.meta.total).toBe(1);
    expect(page.body.data[0]).toMatchObject({ status: 'PENDING' });
  });
});

describe('GET /daily-settlements/:id', () => {
  it('responde 404 para un cuadre de otro prestamista', async () => {
    app = await startTestApp();
    const { cookie } = await seedBusiness(app);
    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;
    const { cookie: otherCookie } = await seedBusiness(app);

    const response = await getSettlement(app, settlementId, otherCookie);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });
});
