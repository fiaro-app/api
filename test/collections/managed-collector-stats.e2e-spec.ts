import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assignNewLoan,
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

function getStats(testApp: TestApp, cookie: string, id: string, query = '') {
  return testApp.http
    .get(`/collectors/${id}/stats${query}`)
    .set(HEADERS)
    .set('Cookie', cookie);
}

describe('GET /collectors/:id/stats', () => {
  it('la dueña ve las estadísticas de su cobrador, con la misma forma que las propias', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    await assignNewLoan(app, business);

    const viewed = await getStats(
      app,
      business.ownerCookie,
      business.collectorMembershipId,
      '?from=2026-10-01&to=2026-10-31',
    );
    const own = await httpQuery(app.http, '/collectors/me/stats')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({ dateRange: { from: '2026-10-01', to: '2026-10-31' } });

    expect(viewed.status).toBe(200);
    expect(viewed.body).toEqual(own.body);
    expect(viewed.body).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-31',
      expectedAmount: 20_000,
      collectedAmount: 0,
      visitsCount: 0,
    });
  });

  it('sin from ni to usa el mes actual', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);

    const response = await getStats(
      app,
      business.ownerCookie,
      business.collectorMembershipId,
    );

    expect(response.status).toBe(200);
    expect(response.body.from <= response.body.to).toBe(true);
    expect(response.body.effectiveness).toBeNull();
  });

  it('responde 403 a un cobrador', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);

    const response = await getStats(
      app,
      business.collectorCookie,
      business.collectorMembershipId,
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('responde 404 para el cobrador de otro prestamista y para un id inexistente', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const other = await seedBusinessWithCollector(app);

    const foreign = await getStats(
      app,
      business.ownerCookie,
      other.collectorMembershipId,
    );
    const missing = await getStats(app, business.ownerCookie, uuidv7());

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it('responde 400 con un id o un período inválidos', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);

    const badId = await getStats(app, business.ownerCookie, 'no-es-uuid');
    const reversed = await getStats(
      app,
      business.ownerCookie,
      business.collectorMembershipId,
      '?from=2026-10-09&to=2026-10-01',
    );

    expect(badId.status).toBe(400);
    expect(reversed.status).toBe(400);
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp(START);

    const response = await app.http.get(`/collectors/${uuidv7()}/stats`);

    expect(response.status).toBe(401);
  });
});
