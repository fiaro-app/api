import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { nextIp } from '@test/support/auth-flow.js';
import {
  HEADERS,
  seedAssignedLoan,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

/** Una visita PAID del cobrador, en `day` (a las 10:00 de Bogotá). */
async function payOn(
  testApp: TestApp,
  business: SeededBusiness & { loanId: string },
  day: string,
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
      occurredAt: `${day}T15:00:00.000Z`,
      payment: { amount, method: 'CASH' },
    });
  expect(response.status).toBe(201);
}

function dashboard(testApp: TestApp, cookie: string, query = '') {
  return testApp.http
    .get(`/lenders/me/dashboard${query}`)
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie);
}

describe('GET /lenders/me/dashboard con período', () => {
  it('sin período, las cifras del período son las de hoy', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await payOn(app, business, TODAY, 5_000);

    const response = await dashboard(app, business.ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.period).toEqual({ from: TODAY, to: TODAY });
    expect(response.body.collectedInPeriod).toBe(5_000);
    expect(response.body.collectedToday).toBe(5_000);
  });

  it('con from y to suma lo cobrado en esos días y deja collectedToday en lo de hoy', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await payOn(app, business, TODAY, 5_000);
    await payOn(app, business, addDays(TODAY, -3), 7_000);
    await payOn(app, business, addDays(TODAY, -8), 100_000);

    const response = await dashboard(
      app,
      business.ownerCookie,
      `?from=${addDays(TODAY, -5)}&to=${TODAY}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.period).toEqual({
      from: addDays(TODAY, -5),
      to: TODAY,
    });
    expect(response.body.collectedInPeriod).toBe(12_000);
    expect(response.body.collectedToday).toBe(5_000);
  });

  it('responde 400 con solo from, con solo to o con un rango al revés', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const onlyFrom = await dashboard(
      app,
      business.ownerCookie,
      `?from=${TODAY}`,
    );
    const onlyTo = await dashboard(app, business.ownerCookie, `?to=${TODAY}`);
    const reversed = await dashboard(
      app,
      business.ownerCookie,
      `?from=${TODAY}&to=${addDays(TODAY, -1)}`,
    );

    expect(onlyFrom.status).toBe(400);
    expect(onlyTo.status).toBe(400);
    expect(reversed.status).toBe(400);
  });
});

describe('QUERY /lenders/me/stats con includePrevious', () => {
  function stats(testApp: TestApp, cookie: string, body: object) {
    return httpQuery(testApp.http, '/lenders/me/stats')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send(body);
  }

  it('sin includePrevious, previous es null, y trae el total cobrado del período', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await payOn(app, business, TODAY, 5_000);

    const response = await stats(app, business.ownerCookie, {
      dateRange: { from: TODAY, to: TODAY },
    });

    expect(response.status).toBe(200);
    expect(response.body.previous).toBeNull();
    expect(response.body.collectedAmount).toBe(5_000);
    expect(response.body.expectedAmount).toBeGreaterThanOrEqual(0);
  });

  it('con includePrevious mide el período anterior de la misma duración', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await payOn(app, business, TODAY, 5_000);
    await payOn(app, business, addDays(TODAY, -1), 3_000);

    const response = await stats(app, business.ownerCookie, {
      dateRange: { from: TODAY, to: TODAY },
      includePrevious: true,
    });

    expect(response.status).toBe(200);
    expect(response.body.collectedAmount).toBe(5_000);
    expect(response.body.previous).toMatchObject({
      from: addDays(TODAY, -1),
      to: addDays(TODAY, -1),
      collectedAmount: 3_000,
    });
    expect(response.body.previous.totalPortfolio).toBeGreaterThanOrEqual(0);
  });

  it('la cartera del período anterior es la que había entonces: sin préstamos todavía, es cero', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app); // el préstamo se creó hoy

    const response = await stats(app, business.ownerCookie, {
      dateRange: { from: TODAY, to: TODAY },
      includePrevious: true,
    });

    expect(response.body.totalPortfolio).toBeGreaterThan(0);
    expect(response.body.previous.totalPortfolio).toBe(0);
    expect(response.body.previous.arrearsRate).toBeNull();
  });
});
