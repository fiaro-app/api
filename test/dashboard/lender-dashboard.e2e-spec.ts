import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import {
  assignNewLoan,
  HEADERS,
  seedAssignedLoan,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

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
  return { phone: `+5730070${suffix}`, nationalId: `7${suffix}` };
}

/** Registra una visita PAID hoy, por `amount` en efectivo, para el préstamo ya asignado. */
async function payToday(
  testApp: TestApp,
  business: SeededBusiness & { loanId: string },
  amount: number,
): Promise<void> {
  const response = await testApp.http
    .post(`/loans/${business.loanId}/collection-visits`)
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', business.collectorCookie)
    .send({
      id: uuidv7(),
      outcome: 'PAID',
      occurredAt: `${TODAY}T15:00:00.000Z`,
      payment: { amount, method: 'CASH' },
    });
  expect(response.status).toBe(201);
}

/** Envía un cuadre con diferencia (requiere `collectorNote`), que queda `PENDING`. */
async function submitSettlementWithDifference(
  testApp: TestApp,
  business: SeededBusiness,
): Promise<void> {
  const response = await testApp.http
    .post('/daily-settlements')
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', business.collectorCookie)
    .send({
      expectedAmount: 50_000,
      collectedCash: 30_000,
      collectedNequi: 0,
      collectedTransfer: 0,
      collectorNote: 'Un cliente no pagó.',
    });
  expect(response.status).toBe(200);
}

describe('GET /lenders/me/dashboard', () => {
  it('agrega cartera, cobro de hoy, cobradores, mora, alertas y cuadres pendientes', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedAssignedLoan(app);
    await payToday(app, business, 20_000);
    await submitSettlementWithDifference(app, business);

    const response = await app.http
      .get('/lenders/me/dashboard')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.ownerCookie);

    expect(response.status).toBe(200);
    const body = response.body as {
      totalPortfolio: number;
      collectedToday: number;
      activeCollectors: number;
      totalCollectors: number;
      effectivenessToday: number | null;
      clientsInArrears: number;
      alerts: string[];
      pendingSettlements: { collectorMembershipId: string; status: string }[];
    };
    // 2: la dueña nace con rol COLLECTOR además de OWNER/LENDER (D-78), y Carlos es el invitado.
    expect(body.totalCollectors).toBe(2);
    expect(body.activeCollectors).toBe(2);
    expect(body.collectedToday).toBe(20_000);
    expect(body.totalPortfolio).toBeGreaterThanOrEqual(0);
    expect(body.clientsInArrears).toBeGreaterThanOrEqual(0);
    expect(body.alerts).toContain(
      '1 cuadre tiene diferencias pendientes de revisar.',
    );
    expect(body.pendingSettlements).toHaveLength(1);
    expect(body.pendingSettlements[0]).toMatchObject({
      collectorMembershipId: business.collectorMembershipId,
      status: 'PENDING',
    });
  });

  it('en un negocio nuevo, sin más que la dueña, todo sale en cero salvo su propio aviso', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { phone, nationalId } = nextIdentity();
    const registerResponse = await app.http
      .post('/register')
      .set(HEADERS)
      .send({
        phone,
        fullName: 'Lender Solo',
        password: 'contraseña-de-prueba-1',
        nationalId,
        businessName: 'Negocio nuevo de prueba',
      });
    expect(registerResponse.status).toBe(201);
    const ownerSignIn = await signIn(app, {
      phone,
      password: 'contraseña-de-prueba-1',
    });

    const response = await app.http
      .get('/lenders/me/dashboard')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', cookieOf(ownerSignIn));

    expect(response.status).toBe(200);
    // 1, no 0: la dueña nace con rol COLLECTOR además de OWNER/LENDER (D-78), y hoy no ha
    // registrado ninguna visita, así que el aviso de "sin ruta iniciada" le aplica a ella misma.
    expect(response.body).toEqual({
      totalPortfolio: 0,
      collectedToday: 0,
      activeCollectors: 1,
      totalCollectors: 1,
      effectivenessToday: null,
      clientsInArrears: 0,
      alerts: ['1 cobrador aún no ha iniciado su ruta hoy.'],
      pendingSettlements: [],
    });
  });

  it('con solo el rol COLLECTOR responde 403', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);
    await assignNewLoan(app, business);

    const response = await app.http
      .get('/lenders/me/dashboard')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.collectorCookie);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sin sesión responde 401', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await app.http
      .get('/lenders/me/dashboard')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(401);
  });
});
