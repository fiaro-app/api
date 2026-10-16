import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());
const DAY_MS = 24 * 60 * 60 * 1000;
const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function started(): TestApp {
  if (app === undefined) {
    throw new Error('la prueba debe arrancar la aplicación primero');
  }
  return app;
}

/** Deja el período pagado terminado hace `days` días (negativo: le quedan días). */
async function endedDaysAgo(days: number): Promise<void> {
  await started().prisma.subscription.updateMany({
    data: { currentPeriodEndsAt: new Date(Date.now() - days * DAY_MS) },
  });
}

function createClient(cookie: string) {
  return started()
    .http.post('/clients')
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .send({
      nationalId: `9${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
      fullName: 'Deudor de Prueba',
      occupation: 'Comerciante',
      phone: '+573009998877',
      address: 'Calle falsa 123',
    });
}

describe('solo lectura al vencer el plan', () => {
  it('pasada la gracia bloquea las escrituras, deja leer y deja cobrar y cuadrar', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await endedDaysAgo(8);

    const blocked = await createClient(business.ownerCookie);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('SUBSCRIPTION_READ_ONLY');
    expect(blocked.body.errorCode).toBe('P113A');

    const read = await app.http
      .get('/subscription')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(read.status).toBe(200);
    expect(read.body.isReadOnly).toBe(true);

    const visit = await app.http
      .post(`/loans/${business.loanId}/collection-visits`)
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.collectorCookie)
      .send({
        id: uuidv7(),
        outcome: 'PAID',
        occurredAt: `${TODAY}T15:00:00.000Z`,
        payment: { amount: 10_000, method: 'CASH' },
      });
    expect(visit.status).toBe(201);

    const settlement = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.collectorCookie)
      .send({
        expectedAmount: 10_000,
        collectedCash: 10_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    expect(settlement.status).toBe(200);
  });

  it('dentro de la gracia todavía se puede escribir', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await endedDaysAgo(3);

    expect((await createClient(business.ownerCookie)).status).toBe(201);
  });

  it('al renovar el período vuelve a dejar escribir', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await endedDaysAgo(8);
    expect((await createClient(business.ownerCookie)).status).toBe(403);

    await endedDaysAgo(-30);

    expect((await createClient(business.ownerCookie)).status).toBe(201);
  });
});
