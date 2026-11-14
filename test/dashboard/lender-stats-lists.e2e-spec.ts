import { afterEach, describe, expect, it } from 'vitest';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

describe('Listas paginadas de las estadísticas (D-117)', () => {
  it('el desempeño y el ranking de mora salen paginados', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const performance = await httpQuery(
      app.http,
      '/lenders/me/stats/collector-performance',
    )
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ page: 2, pageSize: 1 });
    const arrears = await httpQuery(app.http, '/lenders/me/stats/top-arrears')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({});

    expect(performance.status).toBe(200);
    // La dueña también cobra (D-78): es la primera; el cobrador invitado, la segunda.
    expect(performance.body.meta).toEqual({ page: 2, pageSize: 1, total: 2 });
    expect(performance.body.data[0].collectorMembershipId).toBe(
      business.collectorMembershipId,
    );
    expect(arrears.status).toBe(200);
    expect(arrears.body.meta).toMatchObject({ page: 1, pageSize: 10 });
  });

  it('un cobrador no ve las listas del negocio y un período futuro se rechaza', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const asCollector = await httpQuery(
      app.http,
      '/lenders/me/stats/top-arrears',
    )
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({});
    const future = await httpQuery(app.http, '/lenders/me/stats')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ dateRange: { from: '2026-01-01', to: '2999-01-01' } });

    expect(asCollector.status).toBe(403);
    expect(future.status).toBe(400);
    expect(future.body.code).toBe('VALIDATION_FAILED');
  });
});
