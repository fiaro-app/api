import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { httpQuery } from '@test/support/security-app.js';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import { seedLoan, type SeededLoan } from '@test/support/seed-loan.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const PASSWORD = 'contraseña-de-prueba-1';

let app: TestApp | undefined;
let phoneSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Una persona que solo cobra para el negocio del seed, con o sin el préstamo asignado. */
async function addCollector(
  testApp: TestApp,
  seeded: SeededLoan,
  assigned: boolean,
): Promise<{ cookie: string; membershipId: string }> {
  phoneSeq += 1;
  const phone = `+5730099${String(phoneSeq).padStart(5, '0')}`;
  const user = await testApp.createUser({
    phone,
    fullName: 'Cobrador Solo',
    password: PASSWORD,
  });
  const membershipId = uuidv7();
  await testApp.prisma.membership.create({
    data: {
      id: membershipId,
      userId: user.id,
      lenderId: seeded.lenderId,
      roles: ['COLLECTOR'],
    },
  });
  if (assigned) {
    await testApp.prisma.collectionAssignment.create({
      data: {
        id: uuidv7(),
        loanId: seeded.loanId,
        collectorMembershipId: membershipId,
        effectiveFrom: '2026-01-01',
      },
    });
  }
  const response = await signIn(testApp, { phone, password: PASSWORD });
  expect(response.status).toBe(200);
  return { cookie: cookieOf(response), membershipId };
}

describe('un cobrador solo ve lo suyo', () => {
  it('sin el préstamo asignado, todo lo del préstamo responde 404', async () => {
    app = await startTestApp();
    const seeded = await seedLoan(app);
    const { cookie } = await addCollector(app, seeded, false);

    for (const path of [
      `/loans/${seeded.loanId}`,
      `/loans/${seeded.loanId}/balance`,
      `/loans/${seeded.loanId}/installments`,
      `/loans/${seeded.loanId}/collection-visits`,
      `/loans/${seeded.loanId}/collection-assignments`,
      `/clients/${seeded.clientId}`,
    ]) {
      const response = await app.http
        .get(path)
        .set('Cookie', cookie)
        .set('X-Forwarded-For', nextIp());
      expect(response.status, path).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    }
  });

  it('con el préstamo asignado, lo ve', async () => {
    app = await startTestApp();
    const seeded = await seedLoan(app);
    const { cookie } = await addCollector(app, seeded, true);

    for (const path of [
      `/loans/${seeded.loanId}`,
      `/loans/${seeded.loanId}/balance`,
      `/clients/${seeded.clientId}`,
    ]) {
      const response = await app.http
        .get(path)
        .set('Cookie', cookie)
        .set('X-Forwarded-For', nextIp());
      expect(response.status, path).toBe(200);
    }
  });

  it('las listas de préstamos y clientes solo traen su cartera, aunque pida otro filtro', async () => {
    const testApp = await startTestApp();
    app = testApp;
    const seeded = await seedLoan(testApp);
    const idle = await addCollector(testApp, seeded, false);
    const busy = await addCollector(testApp, seeded, true);

    const query = (path: string, cookie: string, body: object = {}) =>
      httpQuery(testApp.http, path)
        .set('Cookie', cookie)
        .set('X-Forwarded-For', nextIp())
        .send({ page: 1, pageSize: 20, ...body });

    const idleLoans = await query('/loans', idle.cookie, {
      collectorMembershipId: busy.membershipId,
    });
    const idleClients = await query('/clients', idle.cookie);
    const busyLoans = await query('/loans', busy.cookie);
    const busyClients = await query('/clients', busy.cookie);
    const ownerLoans = await query('/loans', seeded.cookie);

    expect(idleLoans.body.meta.total).toBe(0);
    expect(idleClients.body.meta.total).toBe(0);
    expect(busyLoans.body.meta.total).toBe(1);
    expect(busyClients.body.meta.total).toBe(1);
    expect(ownerLoans.body.meta.total).toBe(1);
  });

  it('un cobrador no ve el cuadre de otro, pero quien administra sí', async () => {
    app = await startTestApp();
    const seeded = await seedLoan(app);
    const author = await addCollector(app, seeded, true);
    const other = await addCollector(app, seeded, true);

    const submitted = await app.http
      .post('/daily-settlements')
      .set('Cookie', author.cookie)
      .set('X-Forwarded-For', nextIp())
      .send({
        expectedAmount: 10_000,
        collectedCash: 10_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    expect(submitted.status).toBe(200);
    const id = submitted.body.id as string;

    const asOther = await app.http
      .get(`/daily-settlements/${id}`)
      .set('Cookie', other.cookie)
      .set('X-Forwarded-For', nextIp());
    const asAuthor = await app.http
      .get(`/daily-settlements/${id}`)
      .set('Cookie', author.cookie)
      .set('X-Forwarded-For', nextIp());
    const asOwner = await app.http
      .get(`/daily-settlements/${id}`)
      .set('Cookie', seeded.cookie)
      .set('X-Forwarded-For', nextIp());
    const otherList = await httpQuery(app.http, '/daily-settlements')
      .set('Cookie', other.cookie)
      .set('X-Forwarded-For', nextIp())
      .send({
        page: 1,
        pageSize: 20,
        collectorMembershipId: author.membershipId,
      });

    expect(asOther.status).toBe(404);
    expect(asAuthor.status).toBe(200);
    expect(asOwner.status).toBe(200);
    expect(otherList.body.meta.total).toBe(0);
  });
});
