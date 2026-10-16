import { afterEach, describe, expect, it } from 'vitest';
import {
  assignNewLoan,
  HEADERS,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

/** Un celular y una cédula que no usa ningún otro archivo de pruebas. */
let seq = 0;
function identity(): { phone: string; nationalId: string } {
  seq += 1;
  const suffix = String(seq).padStart(5, '0');
  return { phone: `+5731190${suffix}`, nationalId: `82${suffix}` };
}

async function setLimits(
  testApp: TestApp,
  business: SeededBusiness,
  data: { maxAdmins?: number; maxActiveLoans?: number | null },
): Promise<void> {
  const owner = await testApp.prisma.user.findUniqueOrThrow({
    where: { phone: business.ownerPhone },
    select: {
      memberships: { select: { lender: { select: { tenantId: true } } } },
    },
  });
  const [membership] = owner.memberships;
  if (membership === undefined) {
    throw new Error('la dueña debería tener su membresía');
  }
  await testApp.prisma.subscription.update({
    where: { tenantId: membership.lender.tenantId },
    data,
  });
}

function inviteAdmin(testApp: TestApp, business: SeededBusiness) {
  const person = identity();
  return testApp.http
    .post('/memberships')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      ...person,
      contactEmail: `admin-${person.phone.slice(1)}@example.com`,
      fullName: 'Administrador Concurrente',
      roles: ['LENDER'],
    });
}

describe('Cupos de administrador del plan', () => {
  it('con altas simultáneas nunca se pasa del límite, y la dueña cuenta como una', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    await setLimits(app, business, { maxAdmins: 3 });

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => inviteAdmin(started(), business)),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 201, 403, 403, 403,
    ]);
    const denied = responses.find((response) => response.status === 403);
    expect(denied?.body.code).toBe('PLAN_LIMIT_REACHED');
    expect(denied?.body.errorCode).toBe('M007A');
    const subscription = await app.http
      .get('/subscription')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(subscription.body.usage.activeAdmins).toBe(3);
  });

  it('un cobrador no ocupa cupo de administrador', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    await setLimits(app, business, { maxAdmins: 1 });

    const subscription = await app.http
      .get('/subscription')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);

    expect(subscription.body.usage.activeAdmins).toBe(1);
    expect((await inviteAdmin(app, business)).status).toBe(403);
  });
});

describe('Tope de préstamos activos del plan', () => {
  it('bloquea crear el préstamo que pasa del tope y lo permite al subir el plan', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    await assignNewLoan(app, business);
    await setLimits(app, business, { maxActiveLoans: 1 });
    const client = await app.http
      .post('/clients')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        nationalId: '977665544',
        fullName: 'Otro Deudor',
        occupation: 'Comerciante',
        phone: '+573009998866',
        address: 'Calle falsa 456',
      });
    const loan = {
      clientId: client.body.id as string,
      principalAmount: 20_000,
      installmentCount: 2,
      installmentValue: 10_000,
      totalPayable: 20_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
    };
    const create = () =>
      started()
        .http.post('/loans')
        .set(HEADERS)
        .set('Cookie', business.ownerCookie)
        .send(loan);

    const blocked = await create();

    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PLAN_LIMIT_REACHED');
    expect(blocked.body.errorCode).toBe('L004A');
    await setLimits(started(), business, { maxActiveLoans: null });
    expect((await create()).status).toBe(201);
    const subscription = await started()
      .http.get('/subscription')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(subscription.body.usage.activeLoans).toBe(2);
  });
});

function started(): TestApp {
  if (app === undefined) {
    throw new Error('la prueba debe arrancar la aplicación primero');
  }
  return app;
}
