import { toBusinessDate } from '@fiaro-app/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import {
  HEADERS,
  seedBusinessWithCollector,
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

/** Un negocio cuyo cobrador ya cerró el día de hoy. */
async function seedSubmittedSettlement(
  testApp: TestApp,
): Promise<SeededBusiness> {
  const business = await seedBusinessWithCollector(testApp);
  const submitted = await testApp.http
    .post('/daily-settlements')
    .set(HEADERS)
    .set('Cookie', business.collectorCookie)
    .send({
      expectedAmount: 50_000,
      collectedCash: 50_000,
      collectedNequi: 0,
      collectedTransfer: 0,
    });
  expect(submitted.status).toBe(200);
  return business;
}

function list(testApp: TestApp, cookie: string, body: object) {
  return httpQuery(testApp.http, '/daily-settlements')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(body);
}

describe('QUERY /daily-settlements con filtros', () => {
  it('el rango de fechas incluye el día del cuadre en ambos extremos y excluye lo demás', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedSubmittedSettlement(app);

    const exact = await list(app, ownerCookie, {
      dateRange: { from: TODAY, to: TODAY },
    });
    const past = await list(app, ownerCookie, {
      dateRange: { from: addDays(TODAY, -10), to: addDays(TODAY, -1) },
    });
    const future = await list(app, ownerCookie, {
      dateRange: { from: addDays(TODAY, 1), to: addDays(TODAY, 10) },
    });

    expect(exact.status).toBe(200);
    expect(exact.body.meta.total).toBe(1);
    expect(past.body.meta.total).toBe(0);
    expect(future.body.meta.total).toBe(0);
  });

  it('filtra por la cartera del cobrador', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedSubmittedSettlement(app);
    const portfolios = await app.http
      .get('/portfolios')
      .set(HEADERS)
      .set('Cookie', ownerCookie);
    const general = (portfolios.body as { id: string }[])[0];

    const inPortfolio = await list(app, ownerCookie, {
      portfolioId: general?.id,
    });
    const otherPortfolio = await list(app, ownerCookie, {
      portfolioId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
    });

    expect(inPortfolio.body.meta.total).toBe(1);
    expect(otherPortfolio.body.meta.total).toBe(0);
  });

  it('combina cobrador, estado y fechas; y nunca trae cuadres de otro prestamista', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedSubmittedSettlement(app);
    await seedSubmittedSettlement(app);

    const combined = await list(app, business.ownerCookie, {
      collectorMembershipId: business.collectorMembershipId,
      status: 'PENDING',
      dateRange: { from: TODAY, to: TODAY },
    });
    const approved = await list(app, business.ownerCookie, {
      status: 'APPROVED',
    });

    expect(combined.body.meta.total).toBe(1);
    expect(approved.body.meta.total).toBe(0);
  });

  it('responde 400 con un rango al revés', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedSubmittedSettlement(app);

    const response = await list(app, ownerCookie, {
      dateRange: { from: TODAY, to: addDays(TODAY, -1) },
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});
