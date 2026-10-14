import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
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

describe('QUERY /collectors/me/daily-summary', () => {
  it('trae lo cobrado hoy, desglosado por medio, con el historial de visitas', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedAssignedLoan(app);
    await payToday(app, business, 20_000);

    const response = await httpQuery(app.http, '/collectors/me/daily-summary')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({});

    expect(response.status).toBe(200);
    const body = response.body as {
      date: string;
      expectedAmount: number;
      collectedAmount: number;
      collectedByMethod: { CASH: number; NEQUI: number; TRANSFER: number };
      visits: unknown[];
    };
    expect(body.date).toBe(TODAY);
    expect(body.collectedAmount).toBe(20_000);
    expect(body.collectedByMethod).toEqual({
      CASH: 20_000,
      NEQUI: 0,
      TRANSFER: 0,
    });
    expect(body.visits).toHaveLength(1);
    expect(body.expectedAmount).toBeGreaterThanOrEqual(0);
  });
});

describe('QUERY /collectors/me/stats', () => {
  it('trae lo cobrado y las visitas del período pedido', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedAssignedLoan(app);
    await payToday(app, business, 15_000);

    const response = await httpQuery(app.http, '/collectors/me/stats')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({ dateRange: { from: TODAY, to: TODAY } });

    expect(response.status).toBe(200);
    const body = response.body as {
      from: string;
      to: string;
      collectedAmount: number;
      visitsCount: number;
      effectiveness: number | null;
      overdueAmount: number;
    };
    expect(body.from).toBe(TODAY);
    expect(body.to).toBe(TODAY);
    expect(body.collectedAmount).toBe(15_000);
    expect(body.visitsCount).toBe(1);
    expect(body.overdueAmount).toBeGreaterThanOrEqual(0);
  });

  it('sin dateRange, usa el mes actual y responde con números válidos', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedAssignedLoan(app);

    const response = await httpQuery(app.http, '/collectors/me/stats')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({});

    expect(response.status).toBe(200);
    const body = response.body as { from: string; to: string };
    expect(body.to).toBe(TODAY);
    expect(body.from <= TODAY).toBe(true);
  });
});
