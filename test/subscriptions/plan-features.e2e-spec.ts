import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

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

const REPORTS = [
  '/lenders/me/stats/insights',
  '/lenders/me/clients/risk',
  '/lenders/me/stats/top-arrears',
  '/lenders/me/stats/collector-performance',
  '/lenders/me/stats/export',
];

async function business(planCode: string) {
  app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
  const seeded = await seedAssignedLoan(app);
  await app.prisma.subscription.updateMany({ data: { planCode } });
  return seeded;
}

function query(path: string, cookie: string, body: object = {}) {
  return httpQuery(started().http, path)
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(
      path.endsWith('/export')
        ? { format: 'pdf', ...body }
        : path.endsWith('/clients/risk')
          ? { clientIds: [uuidv7()], ...body }
          : body,
    );
}

describe('funciones por plan (D-151)', () => {
  it('Individual no ve el PDF ni los reportes de riesgo, mora y desempeño: 403 PLAN_FEATURE_UNAVAILABLE', async () => {
    const owner = await business('INDIVIDUAL');

    for (const path of REPORTS) {
      const response = await query(path, owner.ownerCookie);
      expect(response.status, path).toBe(403);
      expect(response.body.code, path).toBe('PLAN_FEATURE_UNAVAILABLE');
      expect(response.body.errorCode, path).toBe('P116A');
    }
  });

  it.each(['PRO', 'TEAM', 'TRIAL'])(
    'con el plan %s los reportes y el PDF responden',
    async (plan) => {
      const owner = await business(plan);

      for (const path of REPORTS) {
        expect((await query(path, owner.ownerCookie)).status, path).toBe(200);
      }
    },
  );

  it('Individual sí ve los indicadores del período, pero sin el comparativo', async () => {
    const individual = await business('INDIVIDUAL');
    const withoutPrevious = await query(
      '/lenders/me/stats',
      individual.ownerCookie,
      {
        includePrevious: true,
      },
    );

    expect(withoutPrevious.status).toBe(200);
    expect(withoutPrevious.body.previous).toBeNull();
    await started().prisma.subscription.updateMany({
      data: { planCode: 'PRO' },
    });
    const withPrevious = await query(
      '/lenders/me/stats',
      individual.ownerCookie,
      {
        includePrevious: true,
      },
    );
    expect(withPrevious.body.previous).not.toBeNull();
  });

  it('GET /subscription dice qué funciones trae el plan', async () => {
    const owner = await business('INDIVIDUAL');
    const get = () =>
      started()
        .http.get('/subscription')
        .set(HEADERS)
        .set('Cookie', owner.ownerCookie);

    expect((await get()).body.features).toEqual([]);
    await started().prisma.subscription.updateMany({
      data: { planCode: 'PRO' },
    });
    expect((await get()).body.features).toEqual([
      'ADVANCED_STATS',
      'EXCEL_IMPORT',
    ]);
  });

  it('el PDF de un negocio con marca sale con su color (y se genera aunque el logo no se pueda leer)', async () => {
    const owner = await business('PRO');
    await started().prisma.lender.updateMany({
      data: {
        brandColor: '#3B3382',
        logoUrl: 'http://169.254.169.254/logo.png',
      },
    });

    const response = await query('/lenders/me/stats/export', owner.ownerCookie);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
  });
});
