import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import {
  assignNewLoan,
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

async function pay(
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

function query(testApp: TestApp, path: string, cookie: string, body: object) {
  return httpQuery(testApp.http, path)
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(body);
}

describe('QUERY /loans', () => {
  it('cada fila trae el saldo, la mora y el cobrador, igual que GET /loans/:id/balance', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await pay(app, business, 10_000);

    const list = await query(app, '/loans', business.ownerCookie, {});
    const balance = await app.http
      .get(`/loans/${business.loanId}/balance`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);

    expect(list.status).toBe(200);
    expect(list.body.meta).toEqual({ page: 1, pageSize: 10, total: 1 });
    const row = (list.body.data as Record<string, unknown>[])[0];
    expect(row).toMatchObject({
      id: business.loanId,
      status: 'ACTIVE',
      balance: balance.body.balance,
      overdueAmount: balance.body.overdueAmount,
      overdueDays: balance.body.overdueDays,
      nextDueDate: balance.body.nextDueDate,
      collector: {
        membershipId: business.collectorMembershipId,
        fullName: 'Carlos Cobrador',
      },
    });
    expect(row?.balance).toBe(10_000); // 20.000 pactados - 10.000 pagados
    expect(row?.clientFullName).toEqual(expect.any(String));
    expect(row?.clientFullName).not.toBe('');
  });

  it('con collectorMembershipId trae solo los préstamos que ese cobrador tiene hoy', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const own = await query(app, '/loans', business.ownerCookie, {
      collectorMembershipId: business.collectorMembershipId,
    });
    const other = await query(app, '/loans', business.ownerCookie, {
      collectorMembershipId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
    });

    expect(own.body.meta.total).toBe(1);
    expect(own.body.data[0].id).toBe(business.loanId);
    expect(other.body).toMatchObject({ data: [], meta: { total: 0 } });
  });

  it('un préstamo sin cobrador asignado sale con collector null', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    const clientResponse = await app.http
      .post('/clients')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        nationalId: '9090909090',
        fullName: 'Sin Cobrador',
        occupation: 'Tendero',
        phone: '+573001112233',
        address: 'Calle 1',
      });
    const loanResponse = await app.http
      .post('/loans')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        clientId: clientResponse.body.id,
        principalAmount: 20_000,
        installmentCount: 2,
        installmentValue: 10_000,
        totalPayable: 20_000,
        frequency: 'DAILY',
        startDate: '2026-10-01',
      });

    const list = await query(app, '/loans', business.ownerCookie, {
      clientId: clientResponse.body.id,
    });

    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({
      id: loanResponse.body.id,
      collector: null,
    });
  });

  it('filtra por estado y pagina, y no trae préstamos de otro prestamista', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await assignNewLoan(app, business);
    await seedAssignedLoan(app);

    const all = await query(app, '/loans', business.ownerCookie, {
      pageSize: 1,
    });
    const canceled = await query(app, '/loans', business.ownerCookie, {
      status: 'CANCELED',
    });

    expect(all.body.meta).toEqual({ page: 1, pageSize: 1, total: 2 });
    expect(all.body.data).toHaveLength(1);
    expect(canceled.body.meta.total).toBe(0);
  });

  it('un cobrador también puede verla, y sin sesión responde 401', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const asCollector = await query(
      app,
      '/loans',
      business.collectorCookie,
      {},
    );
    const anonymous = await httpQuery(app.http, '/loans').send({});

    expect(asCollector.status).toBe(200);
    expect(anonymous.status).toBe(401);
  });

  it('responde 400 con un filtro inválido', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);

    const response = await query(app, '/loans', business.ownerCookie, {
      status: 'LATE',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});

describe('QUERY /clients', () => {
  it('cada fila trae lo que debe el cliente y cuántos préstamos activos tiene', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await pay(app, business, 10_000);

    const list = await query(app, '/clients', business.ownerCookie, {});

    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({
      fullName: 'Deudor de Prueba',
      balance: 10_000,
      activeLoans: 1,
    });
    expect(list.body.data[0].overdueAmount).toBeGreaterThanOrEqual(0);
    expect(list.body.data[0].overdueDays).toBeGreaterThanOrEqual(0);
  });

  it('un cliente sin préstamos activos tiene saldo y mora en cero', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    await app.http
      .post('/clients')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        nationalId: '9090909090',
        fullName: 'Sin Préstamos',
        occupation: 'Tendero',
        phone: '+573001112233',
        address: 'Calle 1',
      });

    const list = await query(app, '/clients', business.ownerCookie, {
      search: 'Sin Préstamos',
    });

    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      fullName: 'Sin Préstamos',
      balance: 0,
      overdueAmount: 0,
      overdueDays: 0,
      activeLoans: 0,
    });
  });

  it('busca por nombre, no trae clientes de otro prestamista y valida el cuerpo', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    const other = await seedAssignedLoan(app);

    const found = await query(app, '/clients', business.ownerCookie, {
      search: 'Deudor',
    });
    const none = await query(app, '/clients', business.ownerCookie, {
      search: 'Nadie',
    });
    const foreign = await query(app, '/clients', other.ownerCookie, {});
    const invalid = await query(app, '/clients', business.ownerCookie, {
      sort: 'name',
    });

    expect(found.body.meta.total).toBe(1);
    expect(none.body.meta.total).toBe(0);
    expect(foreign.body.meta.total).toBe(1);
    expect(foreign.body.data[0].id).not.toBe(found.body.data[0].id);
    expect(invalid.status).toBe(400);
  });
});
