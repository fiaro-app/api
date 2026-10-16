import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import {
  HEADERS,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

const TERMS = {
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY',
  startDate: '2026-12-01',
};

const NEW_CLIENT = {
  fullName: 'Rosa Elena Pardo',
  occupation: 'Tendera',
  phone: '+573001112233',
  address: 'Carrera 7 # 8-9, Bogotá',
};

function post(testApp: TestApp, path: string, cookie: string, body: object) {
  return testApp.http
    .post(path)
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie)
    .send(body);
}

function query(testApp: TestApp, path: string, cookie: string, body: object) {
  return httpQuery(testApp.http, path)
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(body);
}

async function request(
  testApp: TestApp,
  business: SeededBusiness,
  body: object,
): Promise<{ id: string }> {
  const created = await post(
    testApp,
    '/loan-requests',
    business.collectorCookie,
    body,
  );
  expect(created.status).toBe(201);
  return created.body as { id: string };
}

describe('solicitudes de préstamo de un cobrador', () => {
  it('con un cliente nuevo: el cobrador la hace, el administrador la acepta y se crea todo', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);

    const lookup = await post(
      app,
      '/loan-requests/client-lookup',
      business.collectorCookie,
      { nationalId: '51.234.567' },
    );
    expect(lookup.body).toEqual({ exists: false });

    const created = await post(
      app,
      '/loan-requests',
      business.collectorCookie,
      {
        nationalId: '51.234.567',
        client: NEW_CLIENT,
        ...TERMS,
      },
    );
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      status: 'PENDING',
      clientId: null,
      nationalId: '51234567',
      newClient: NEW_CLIENT,
      requestedByMembershipId: business.collectorMembershipId,
    });

    const ownerNotifications = await query(
      app,
      '/notifications',
      business.ownerCookie,
      { unreadOnly: true },
    );
    expect(
      (ownerNotifications.body.data as { title: string }[]).map(
        (item) => item.title,
      ),
    ).toContain('Solicitud de préstamo');

    const one = await app.http
      .get(`/loan-requests/${(created.body as { id: string }).id}`)
      .set(HEADERS)
      .set('Cookie', business.collectorCookie);
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({
      nationalId: '51234567',
      status: 'PENDING',
    });

    const pending = await query(app, '/loan-requests', business.ownerCookie, {
      status: 'PENDING',
    });
    expect(pending.body.meta.total).toBe(1);

    const approved = await post(
      app,
      `/loan-requests/${(created.body as { id: string }).id}/approve`,
      business.ownerCookie,
      {
        loan: { principalAmount: 450_000 },
        client: { occupation: 'Comerciante' },
      },
    );
    expect(approved.status).toBe(200);
    expect(approved.body).toMatchObject({
      status: 'APPROVED',
      principalAmount: TERMS.principalAmount,
    });
    const loanId = (approved.body as { loanId: string }).loanId;

    const loan = await app.http
      .get(`/loans/${loanId}`)
      .set(HEADERS)
      .set('Cookie', business.collectorCookie);
    expect(loan.status).toBe(200);
    expect(loan.body).toMatchObject({
      principalAmount: 450_000,
      status: 'ACTIVE',
    });

    const afterwards = await post(
      app,
      '/loan-requests/client-lookup',
      business.collectorCookie,
      { nationalId: '51234567' },
    );
    expect(afterwards.body).toEqual({ exists: true });

    const collectorNotifications = await query(
      app,
      '/notifications',
      business.collectorCookie,
      {},
    );
    expect(
      (collectorNotifications.body.data as { title: string }[]).map(
        (item) => item.title,
      ),
    ).toContain('Solicitud aceptada');
  });

  it('con un cliente que ya existe no pide datos; rechazarla avisa con el motivo y no se puede resolver dos veces', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const first = await request(app, business, {
      nationalId: '51234567',
      client: NEW_CLIENT,
      ...TERMS,
    });
    const approved = await post(
      app,
      `/loan-requests/${first.id}/approve`,
      business.ownerCookie,
      {},
    );
    expect(approved.status).toBe(200);

    const second = await post(app, '/loan-requests', business.collectorCookie, {
      nationalId: '51234567',
      ...TERMS,
    });
    expect(second.status).toBe(201);
    expect(second.body).toMatchObject({ newClient: null });
    expect(
      (second.body as { clientId: string | null }).clientId,
    ).not.toBeNull();

    const rejected = await post(
      app,
      `/loan-requests/${(second.body as { id: string }).id}/reject`,
      business.ownerCookie,
      { reason: 'Todavía debe el anterior.' },
    );
    expect(rejected.status).toBe(200);
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Todavía debe el anterior.',
    });

    const again = await post(
      app,
      `/loan-requests/${(second.body as { id: string }).id}/approve`,
      business.ownerCookie,
      {},
    );
    expect(again.status).toBe(409);

    const own = await query(
      app,
      '/loan-requests',
      business.collectorCookie,
      {},
    );
    expect(own.body.meta.total).toBe(2);
  });

  it('valida los datos y respeta los roles', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);

    const withoutClient = await post(
      app,
      '/loan-requests',
      business.collectorCookie,
      { nationalId: '51234567', ...TERMS },
    );
    expect(withoutClient.status).toBe(400);

    const badTerms = await post(
      app,
      '/loan-requests',
      business.collectorCookie,
      {
        nationalId: '51234567',
        client: NEW_CLIENT,
        ...TERMS,
        installmentCount: 0,
      },
    );
    expect(badTerms.status).toBe(400);

    const created = await request(app, business, {
      nationalId: '51234567',
      client: NEW_CLIENT,
      ...TERMS,
    });
    const collectorApproves = await post(
      app,
      `/loan-requests/${created.id}/approve`,
      business.collectorCookie,
      {},
    );
    expect(collectorApproves.status).toBe(403);
    const collectorRejects = await post(
      app,
      `/loan-requests/${created.id}/reject`,
      business.collectorCookie,
      {},
    );
    expect(collectorRejects.status).toBe(403);

    const unknown = await post(
      app,
      '/loan-requests/019dc2d6-0000-7000-8000-000000000000/approve',
      business.ownerCookie,
      {},
    );
    expect(unknown.status).toBe(404);
  });
});
