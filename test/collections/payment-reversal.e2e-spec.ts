import { LEGAL_ACCEPTANCE } from '@test/support/legal-acceptance.js';
import type { Response } from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
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
  return { phone: `+5730020${suffix}`, nationalId: `2${suffix}` };
}

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

/**
 * Registra un negocio nuevo (el dueño nace con OWNER, LENDER y COLLECTOR, D-78), un cliente y un
 * préstamo DAILY de 2 cuotas de 10.000 (total 20.000). Deja la sesión del dueño abierta.
 */
async function seedLoan(
  testApp: TestApp,
): Promise<{ loanId: string; cookie: string }> {
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
  const membershipId = (registerResponse.body as { membership: { id: string } })
    .membership.id;

  const signInResponse = await signIn(testApp, {
    phone,
    password: 'contraseña-de-prueba-1',
  });
  expect(signInResponse.status).toBe(200);
  const cookie = cookieOf(signInResponse);

  const clientResponse = await testApp.http
    .post('/clients')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({
      nationalId: `9${nationalId}`,
      fullName: 'Carlos Deudor',
      occupation: 'Comerciante',
      phone: '+573009998877',
      address: 'Calle falsa 123',
    });
  expect(clientResponse.status).toBe(201);

  const loanResponse = await testApp.http
    .post('/loans')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({
      clientId: clientResponse.body.id,
      principalAmount: 20_000,
      installmentCount: 2,
      installmentValue: 10_000,
      totalPayable: 20_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
    });
  expect(loanResponse.status).toBe(201);
  const loanId = loanResponse.body.id as string;

  // "Modo cobrador" (D-89): hace falta una asignación vigente para registrar visitas.
  const assignmentResponse = await testApp.http
    .post(`/loans/${loanId}/collection-assignments`)
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({ collectorMembershipId: membershipId, effectiveFrom: '2026-10-01' });
  expect(assignmentResponse.status).toBe(201);

  return { loanId, cookie };
}

/** Registra una visita PAID por `amount` y devuelve el id del pago que generó. */
async function payVisit(
  testApp: TestApp,
  loanId: string,
  cookie: string,
  amount: number,
): Promise<string> {
  const response = await testApp.http
    .post(`/loans/${loanId}/collection-visits`)
    .set(HEADERS)
    .set('Cookie', cookie)
    .set('X-Forwarded-For', nextIp())
    .send({
      id: uuidv7(),
      outcome: 'PAID',
      occurredAt: '2026-10-01T15:00:00.000Z',
      payment: { amount },
    });
  expect(response.status).toBe(201);
  return (response.body as { payment: { id: string } }).payment.id;
}

async function getLoan(
  testApp: TestApp,
  loanId: string,
  cookie: string,
): Promise<Response> {
  return testApp.http
    .get(`/loans/${loanId}`)
    .set('Cookie', cookie)
    .set('X-Forwarded-For', nextIp());
}

describe('POST /payments/:id/reversals', () => {
  it('cierra el préstamo a PAID_OFF al pagarlo del todo, y lo reabre al reversar un pago', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app);

    await payVisit(app, loanId, cookie, 10_000);
    const paidOffLoan = await getLoan(app, loanId, cookie);
    expect(paidOffLoan.body.status).toBe('ACTIVE'); // falta la segunda cuota

    const secondPaymentId = await payVisit(app, loanId, cookie, 10_000);
    const closedLoan = await getLoan(app, loanId, cookie);
    expect(closedLoan.body.status).toBe('PAID_OFF');
    expect(closedLoan.body.closedAt).not.toBeNull();

    const reversalResponse = await app.http
      .post(`/payments/${secondPaymentId}/reversals`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reason: 'El cobrador registró el monto equivocado.' });

    expect(reversalResponse.status).toBe(201);
    expect(reversalResponse.body).toMatchObject({
      paymentId: secondPaymentId,
      reason: 'El cobrador registró el monto equivocado.',
    });

    const reopenedLoan = await getLoan(app, loanId, cookie);
    expect(reopenedLoan.body.status).toBe('ACTIVE');
    expect(reopenedLoan.body.closedAt).toBeNull();
  });

  it('el pago reversado queda intacto, pero marcado en el historial de visitas', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app);
    const paymentId = await payVisit(app, loanId, cookie, 10_000);

    await app.http
      .post(`/payments/${paymentId}/reversals`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reason: 'Monto equivocado.' });

    const visits = await app.http
      .get(`/loans/${loanId}/collection-visits`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(visits.body[0].payment).toMatchObject({
      id: paymentId,
      amount: 10_000,
      reversal: { reason: 'Monto equivocado.' },
    });
  });

  it('responde 409 si ese pago ya tiene una reversión', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app);
    const paymentId = await payVisit(app, loanId, cookie, 10_000);
    await app.http
      .post(`/payments/${paymentId}/reversals`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reason: 'Primera corrección.' });

    const response = await app.http
      .post(`/payments/${paymentId}/reversals`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reason: 'Segundo intento.' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
  });

  it('responde 404 para un pago de otro prestamista', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app);
    const paymentId = await payVisit(app, loanId, cookie, 10_000);
    const { cookie: otherCookie } = await seedLoan(app);

    const response = await app.http
      .post(`/payments/${paymentId}/reversals`)
      .set(HEADERS)
      .set('Cookie', otherCookie)
      .send({ reason: 'Monto equivocado.' });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('responde 400 si el motivo está vacío', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app);
    const paymentId = await payVisit(app, loanId, cookie, 10_000);

    const response = await app.http
      .post(`/payments/${paymentId}/reversals`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ reason: '' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});
