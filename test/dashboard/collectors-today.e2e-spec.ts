import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

describe('GET /lenders/me/collectors-today', () => {
  it('muestra a quien no ha empezado y luego a quien ya visitó todo su ruta', async () => {
    const testApp = await startTestApp(START);
    app = testApp;
    const business = await seedAssignedLoan(testApp);
    const get = (cookie: string) =>
      testApp.http
        .get('/lenders/me/collectors-today')
        .set(HEADERS)
        .set('X-Forwarded-For', nextIp())
        .set('Cookie', cookie);

    const before = await get(business.ownerCookie);
    expect(before.status).toBe(200);
    expect(before.body.counts.NOT_STARTED).toBe(1);
    expect(before.body.collectors[0]).toMatchObject({
      status: 'NOT_STARTED',
      routeLoans: 1,
      visitedLoans: 0,
      pendingLoans: 1,
      firstVisitAt: null,
    });

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

    const after = await get(business.ownerCookie);
    expect(after.body.counts.FINISHED).toBe(1);
    expect(after.body.collectors[0]).toMatchObject({
      status: 'FINISHED',
      visitedLoans: 1,
      pendingLoans: 0,
      collectedAmount: 10_000,
    });
    expect(after.body.collectors[0].firstVisitAt).not.toBeNull();
  });

  it('un cobrador recibe 403 y sin sesión 401', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const asCollector = await app.http
      .get('/lenders/me/collectors-today')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp())
      .set('Cookie', business.collectorCookie);
    const anonymous = await app.http
      .get('/lenders/me/collectors-today')
      .set('X-Forwarded-For', nextIp());

    expect(asCollector.status).toBe(403);
    expect(anonymous.status).toBe(401);
  });
});
