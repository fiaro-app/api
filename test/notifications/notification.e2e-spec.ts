import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

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
  return { phone: `+5730040${suffix}`, nationalId: `4${suffix}` };
}

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

/**
 * Registra un negocio nuevo (la dueña nace con OWNER, LENDER y COLLECTOR, D-78), un cobrador
 * aparte (solo COLLECTOR, en la cartera General que nace con el Lender) y un préstamo asignado a
 * ese cobrador. El alta de la asignación es lo que dispara "préstamo asignado" (D-87).
 */
async function seedAssignedLoan(testApp: TestApp): Promise<{
  ownerCookie: string;
  collectorCookie: string;
  collectorMembershipId: string;
  loanId: string;
}> {
  const owner = nextIdentity();
  const registerResponse = await testApp.http
    .post('/register')
    .set(HEADERS)
    .send({
      phone: owner.phone,
      fullName: 'Marta Ríos (dueña de prueba de notificaciones)',
      password: 'contraseña-de-prueba-1',
      nationalId: owner.nationalId,
      businessName: 'Negocio de prueba de notificaciones',
    });
  expect(registerResponse.status).toBe(201);
  const ownerSignIn = await signIn(testApp, {
    phone: owner.phone,
    password: 'contraseña-de-prueba-1',
  });
  const ownerCookie = cookieOf(ownerSignIn);

  const portfolios = await testApp.http
    .get('/portfolios')
    .set('Cookie', ownerCookie)
    .set('X-Forwarded-For', nextIp());
  const generalPortfolio = (portfolios.body as { id: string }[])[0];
  if (generalPortfolio === undefined) {
    throw new Error(
      'el prestamista nuevo debería nacer con la cartera General',
    );
  }

  const collector = nextIdentity();
  const inviteResponse = await testApp.http
    .post('/memberships')
    .set(HEADERS)
    .set('Cookie', ownerCookie)
    .send({
      phone: collector.phone,
      fullName: 'Carlos Cobrador',
      nationalId: collector.nationalId,
      roles: ['COLLECTOR'],
      portfolioId: generalPortfolio.id,
    });
  expect(inviteResponse.status).toBe(201);
  const collectorMembershipId = (
    inviteResponse.body as { membership: { id: string } }
  ).membership.id;
  const tempPassword = (inviteResponse.body as { tempPassword: string })
    .tempPassword;

  const clientResponse = await testApp.http
    .post('/clients')
    .set(HEADERS)
    .set('Cookie', ownerCookie)
    .send({
      nationalId: `9${owner.nationalId}`,
      fullName: 'Deudor de Prueba',
      occupation: 'Comerciante',
      phone: '+573009998877',
      address: 'Calle falsa 123',
    });
  const loanResponse = await testApp.http
    .post('/loans')
    .set(HEADERS)
    .set('Cookie', ownerCookie)
    .send({
      clientId: clientResponse.body.id,
      principalAmount: 20_000,
      installmentCount: 2,
      installmentValue: 10_000,
      totalPayable: 20_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
    });
  const loanId = loanResponse.body.id as string;

  const assignmentResponse = await testApp.http
    .post(`/loans/${loanId}/collection-assignments`)
    .set(HEADERS)
    .set('Cookie', ownerCookie)
    .send({ collectorMembershipId, effectiveFrom: '2026-10-01' });
  expect(assignmentResponse.status).toBe(201);

  const collectorSignIn = await signIn(testApp, {
    phone: collector.phone,
    password: tempPassword,
  });
  const tempCollectorCookie = cookieOf(collectorSignIn);

  // Con contraseña temporal, PRODUCT.md §8 solo deja ver la sesión, cambiar la contraseña y
  // cerrar sesión: hay que cambiarla antes de poder llamar cualquier otra ruta. better-auth exige
  // que el Origin de esta petición esté en CORS_ORIGINS (D-40): por eso startTestApp recibe ese
  // override más abajo, no solo HEADERS. Cambiarla entrega una sesión nueva (D-50): la cookie que
  // sigue sirviendo es la de esta respuesta, no la del inicio de sesión con la temporal.
  const changePasswordResponse = await testApp.http
    .post('/auth/change-password')
    .set(HEADERS)
    .set('Cookie', tempCollectorCookie)
    .send({
      currentPassword: tempPassword,
      newPassword: 'contraseña-nueva-del-cobrador-1',
    });
  expect(changePasswordResponse.status).toBe(200);
  const collectorCookie = cookieOf(changePasswordResponse);

  return { ownerCookie, collectorCookie, collectorMembershipId, loanId };
}

describe('notificaciones de préstamo asignado', () => {
  it('avisa al cobrador, y marcarla como leída la saca de unreadOnly', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie, loanId } = await seedAssignedLoan(app);

    const page = await httpQuery(app.http, '/notifications')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({});
    expect(page.status).toBe(200);
    const notification = (
      page.body as {
        data: { id: string; title: string; relatedEntityId: string }[];
      }
    ).data.find((item) => item.title === 'Préstamo asignado');
    if (notification === undefined) {
      throw new Error(
        'debería haber recibido la notificación de préstamo asignado',
      );
    }
    expect(notification.relatedEntityId).toBe(loanId);

    const read = await app.http
      .post(`/notifications/${notification.id}/read`)
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({});
    expect(read.status).toBe(200);
    expect(read.body.readAt).not.toBeNull();

    const unread = await httpQuery(app.http, '/notifications')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({ unreadOnly: true });
    expect(
      (unread.body as { data: { id: string }[] }).data.some(
        (item) => item.id === notification.id,
      ),
    ).toBe(false);
  });

  it('responde 404 si se intenta marcar como leída la notificación de otra persona', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie, collectorCookie } = await seedAssignedLoan(app);
    const page = await httpQuery(app.http, '/notifications')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({});
    const notification = (page.body as { data: { id: string }[] }).data[0];
    if (notification === undefined) {
      throw new Error('el cobrador debería tener al menos una notificación');
    }

    const response = await app.http
      .post(`/notifications/${notification.id}/read`)
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({});

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });
});

describe('notificaciones de cuadres', () => {
  it('avisa a quien administra el prestamista cuando hay un cuadre por revisar', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedAssignedLoan(app);

    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;

    const page = await httpQuery(app.http, '/notifications')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({});
    const notification = (
      page.body as { data: { title: string; relatedEntityId: string }[] }
    ).data.find((item) => item.title === 'Cuadre por revisar');
    expect(notification?.relatedEntityId).toBe(settlementId);
  });

  it('avisa al cobrador con el motivo del rechazo', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedAssignedLoan(app);
    const submitted = await app.http
      .post('/daily-settlements')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({
        expectedAmount: 50_000,
        collectedCash: 50_000,
        collectedNequi: 0,
        collectedTransfer: 0,
      });
    const settlementId = (submitted.body as { id: string }).id;

    await app.http
      .post(`/daily-settlements/${settlementId}/reject`)
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({ reviewNote: 'Falta soportar la diferencia.' });

    const page = await httpQuery(app.http, '/notifications')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({});
    const notification = (
      page.body as { data: { title: string; body: string }[] }
    ).data.find((item) => item.title === 'Cuadre rechazado');
    expect(notification?.body).toBe('Falta soportar la diferencia.');
  });
});
