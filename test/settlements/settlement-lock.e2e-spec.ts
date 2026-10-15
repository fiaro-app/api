import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());
const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

type Business = Awaited<ReturnType<typeof seedAssignedLoan>>;

const SETTLEMENT = {
  expectedAmount: 10_000,
  collectedCash: 10_000,
  collectedNequi: 0,
  collectedTransfer: 0,
};

function as(testApp: TestApp, cookie: string) {
  return {
    post: (path: string) =>
      testApp.http
        .post(path)
        .set(HEADERS)
        .set('X-Forwarded-For', nextIp())
        .set('Cookie', cookie),
  };
}

const visitBody = () => ({
  id: uuidv7(),
  outcome: 'PAID',
  occurredAt: `${TODAY}T15:00:00.000Z`,
  payment: { amount: 10_000, method: 'CASH' },
});

async function collect(testApp: TestApp, business: Business) {
  return as(testApp, business.collectorCookie)
    .post(`/loans/${business.loanId}/collection-visits`)
    .send(visitBody());
}

async function submit(testApp: TestApp, business: Business) {
  return as(testApp, business.collectorCookie)
    .post('/daily-settlements')
    .send(SETTLEMENT);
}

describe('el cuadre del día cierra los cobros', () => {
  it('con el cuadre en revisión no se cobra ni se reenvía, y al cancelarlo se vuelve a poder', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    expect((await collect(app, business)).status).toBe(201);
    const sent = await submit(app, business);
    expect(sent.status).toBe(200);

    expect((await collect(app, business)).status).toBe(409);
    expect((await submit(app, business)).status).toBe(409);

    const cancelled = await as(app, business.collectorCookie).post(
      `/daily-settlements/${sent.body.id as string}/cancel`,
    );
    expect(cancelled.status).toBe(204);
    expect((await collect(app, business)).status).toBe(201);
    expect((await submit(app, business)).status).toBe(200);
  });

  it('con el cuadre aprobado ya no se cobra ni se puede cancelar', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    const sent = await submit(app, business);
    const id = sent.body.id as string;

    const approved = await as(app, business.ownerCookie)
      .post(`/daily-settlements/${id}/approve`)
      .send({});
    expect(approved.status).toBe(200);

    expect((await collect(app, business)).status).toBe(409);
    const cancel = await as(app, business.collectorCookie).post(
      `/daily-settlements/${id}/cancel`,
    );
    expect(cancel.status).toBe(409);
  });

  it('con el cuadre rechazado puede seguir cobrando y reenviarlo', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    const id = (await submit(app, business)).body.id as string;
    await as(app, business.ownerCookie)
      .post(`/daily-settlements/${id}/reject`)
      .send({ reviewNote: 'Revisa el efectivo' });

    expect((await collect(app, business)).status).toBe(201);
    expect((await submit(app, business)).status).toBe(200);
  });

  it('nadie cancela un cuadre que no es suyo: responde como si no existiera', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    const id = (await submit(app, business)).body.id as string;

    const asOwner = await as(app, business.ownerCookie).post(
      `/daily-settlements/${id}/cancel`,
    );

    expect(asOwner.status).toBe(404);
  });
});
