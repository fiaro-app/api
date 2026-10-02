import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';
import { addDays } from '@/shared/domain/calendar/business-date.js';

const TODAY = toBusinessDate(new Date());
const TOMORROW = addDays(TODAY, 1);

let app: TestApp | undefined;
let seedSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
function nextIdentity(): { phone: string; nationalId: string } {
  seedSeq += 1;
  const suffix = String(seedSeq).padStart(5, '0');
  return { phone: `+5730050${suffix}`, nationalId: `5${suffix}` };
}

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

/** Registra un negocio nuevo (la dueña nace con OWNER, LENDER y COLLECTOR, D-78). */
async function seedBusiness(
  testApp: TestApp,
): Promise<{ cookie: string; membershipId: string }> {
  const { phone, nationalId } = nextIdentity();
  const registerResponse = await testApp.http
    .post('/register')
    .set(HEADERS)
    .send({
      phone,
      fullName: 'Gloria Ruta (dueña de prueba de rutas)',
      password: 'contraseña-de-prueba-1',
      nationalId,
      businessName: 'Negocio de prueba de rutas',
    });
  expect(registerResponse.status).toBe(201);
  const membershipId = (registerResponse.body as { membership: { id: string } })
    .membership.id;
  const signInResponse = await signIn(testApp, {
    phone,
    password: 'contraseña-de-prueba-1',
  });
  return { cookie: cookieOf(signInResponse), membershipId };
}

async function seedLoan(
  testApp: TestApp,
  cookie: string,
  clientName: string,
): Promise<{ loanId: string }> {
  const clientResponse = await testApp.http
    .post('/clients')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({
      nationalId: `9${nextIdentity().nationalId}`,
      fullName: clientName,
      occupation: 'Comerciante',
      phone: '+573009998877',
      address: 'Calle falsa 123',
    });
  expect(clientResponse.status).toBe(201);
  const loanResponse = await testApp.http
    .post('/loans')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({
      clientId: clientResponse.body.id,
      principalAmount: 20_000,
      installmentCount: 2,
      installmentValue: 10_000,
      totalPayable: 20_000,
      frequency: 'DAILY',
      startDate: TODAY,
    });
  expect(loanResponse.status).toBe(201);
  return { loanId: loanResponse.body.id as string };
}

describe('QUERY /collectors/me/route', () => {
  it('trae los préstamos con asignación vigente hoy, con el cliente y el saldo', async () => {
    app = await startTestApp();
    const { cookie, membershipId } = await seedBusiness(app);
    const { loanId } = await seedLoan(app, cookie, 'Carlos Deudor');

    await app.http
      .post(`/loans/${loanId}/collection-assignments`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        collectorMembershipId: membershipId,
        effectiveFrom: TODAY,
      });

    const route = await httpQuery(app.http, '/collectors/me/route')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({});

    expect(route.status).toBe(200);
    expect(route.body).toEqual([
      expect.objectContaining({
        loanId,
        clientFullName: 'Carlos Deudor',
        balance: 20_000,
      }),
    ]);
  });

  it('une lo asignado con lo prometido, y la promesa sobrevive a que la asignación venza', async () => {
    app = await startTestApp();
    const { cookie, membershipId } = await seedBusiness(app);
    const { loanId: assignedLoanId } = await seedLoan(
      app,
      cookie,
      'Ana Asignada',
    );
    const { loanId: promisedLoanId } = await seedLoan(
      app,
      cookie,
      'Pedro Prometido',
    );
    const dayAfterTomorrow = addDays(TOMORROW, 1);

    // Asignación permanente: cubre cualquier fecha futura.
    await app.http
      .post(`/loans/${assignedLoanId}/collection-assignments`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ collectorMembershipId: membershipId, effectiveFrom: TODAY });

    // Asignación de un solo día (hoy): hace falta para poder registrar la visita de hoy
    // ("modo cobrador", D-89), pero ya no cubre mañana ni después.
    await app.http
      .post(`/loans/${promisedLoanId}/collection-assignments`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({
        collectorMembershipId: membershipId,
        effectiveFrom: TODAY,
        effectiveTo: TODAY,
      });

    await app.http
      .post(`/loans/${promisedLoanId}/collection-visits`)
      .set(HEADERS)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp())
      .send({
        id: uuidv7(),
        outcome: 'RESCHEDULED',
        occurredAt: `${TODAY}T15:00:00.000Z`,
        promisedDate: TOMORROW,
      });

    const tomorrowRoute = await httpQuery(app.http, '/collectors/me/route')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ date: TOMORROW });
    const tomorrowLoanIds = (tomorrowRoute.body as { loanId: string }[]).map(
      (entry) => entry.loanId,
    );
    expect(tomorrowLoanIds).toContain(assignedLoanId);
    expect(tomorrowLoanIds).toContain(promisedLoanId);
    expect(tomorrowLoanIds).toHaveLength(2);

    // Pasado mañana, ni la asignación de un día ni la promesa (era solo para mañana) siguen
    // vigentes: el prometido ya no debería aparecer.
    const laterRoute = await httpQuery(app.http, '/collectors/me/route')
      .set(HEADERS)
      .set('Cookie', cookie)
      .send({ date: dayAfterTomorrow });
    const laterLoanIds = (laterRoute.body as { loanId: string }[]).map(
      (entry) => entry.loanId,
    );
    expect(laterLoanIds).toEqual([assignedLoanId]);
  });
});
