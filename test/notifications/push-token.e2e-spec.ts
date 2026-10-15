import { afterEach, describe, expect, it } from 'vitest';
import type { PushMessage } from '@/modules/notifications/domain/push-message.js';
import {
  assignNewLoan,
  HEADERS,
  seedBusinessWithCollector,
  verifyContactEmail,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const CORS = { CORS_ORIGINS: HEADERS.Origin };
const DEVICE = 'ExponentPushToken[dispositivo-prueba-1]';

/** Los push que se pidieron mandar a ese dispositivo. */
function pushedTo(testApp: TestApp, token: string): PushMessage[] {
  return testApp.pushes.sent.filter((message) => message.to === token);
}

/** El cobrador registra el dispositivo, como lo haría la app al abrir la sesión. */
async function registerDevice(
  testApp: TestApp,
  cookie: string,
  token: string,
): Promise<void> {
  const response = await testApp.http
    .post('/push-tokens')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({ token });
  expect(response.status).toBe(204);
}

describe('registro de dispositivos para push (D-95)', () => {
  it('rechaza un token que no tiene la forma de Expo', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post('/push-tokens')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({ token: 'no-es-un-token' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('manda a su dispositivo el aviso de un préstamo asignado, con la notificación para abrirla', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await registerDevice(app, business.collectorCookie, DEVICE);

    const loanId = await assignNewLoan(app, business);

    const [push] = pushedTo(app, DEVICE);
    expect(push?.title).toBe('Préstamo asignado');
    expect(push?.body).toBe('Te asignaron un préstamo para cobrar.');
    expect(push?.data.relatedEntityType).toBe('LOAN');
    expect(push?.data.relatedEntityId).toBe(loanId);
  });

  it('registrar el mismo token dos veces no duplica el aviso', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await registerDevice(app, business.collectorCookie, DEVICE);
    await registerDevice(app, business.collectorCookie, DEVICE);

    await assignNewLoan(app, business);

    expect(pushedTo(app, DEVICE)).toHaveLength(1);
  });

  it('si otra sesión entra en el mismo dispositivo, el token pasa a esa sesión y la anterior deja de recibir', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await registerDevice(app, business.ownerCookie, DEVICE);
    await registerDevice(app, business.collectorCookie, DEVICE);

    await assignNewLoan(app, business);
    expect(pushedTo(app, DEVICE)).toHaveLength(1);

    // La cobradora cierra su día: la dueña recibe el aviso por el feed, pero ya no tiene dispositivo.
    const submitted = await app.http
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

    expect(pushedTo(app, DEVICE)).toHaveLength(1);
  });

  it('quitar un token ajeno no quita el registro de quien lo tiene', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await registerDevice(app, business.collectorCookie, DEVICE);

    const response = await app.http
      .post('/push-tokens/revoke')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ token: DEVICE });
    expect(response.status).toBe(204);

    await assignNewLoan(app, business);
    expect(pushedTo(app, DEVICE)).toHaveLength(1);
  });

  it('quitar el propio token deja de mandar push a ese dispositivo', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await registerDevice(app, business.collectorCookie, DEVICE);

    const response = await app.http
      .post('/push-tokens/revoke')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({ token: DEVICE });
    expect(response.status).toBe(204);

    await assignNewLoan(app, business);
    expect(pushedTo(app, DEVICE)).toHaveLength(0);
  });

  it('una cuenta desactivada no recibe push aunque su dispositivo esté registrado', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await registerDevice(app, business.collectorCookie, DEVICE);
    await app.prisma.user.update({
      where: { phone: business.collectorPhone },
      data: { deactivatedAt: new Date('2026-10-05T12:00:00Z') },
    });

    await assignNewLoan(app, business);

    expect(pushedTo(app, DEVICE)).toHaveLength(0);
  });

  it('una notificación informativa llega solo como push aunque haya correo verificado (D-125)', async () => {
    app = await startTestApp({ env: CORS });
    const business = await seedBusinessWithCollector(app);
    await verifyContactEmail(
      app,
      business.collectorPhone,
      'cobrador@example.com',
    );
    await registerDevice(app, business.collectorCookie, DEVICE);

    await assignNewLoan(app, business);

    expect(
      app.emails.sent.filter(
        (email) =>
          email.to === 'cobrador@example.com' &&
          email.subject === 'Fiaro: Préstamo asignado',
      ),
    ).toHaveLength(0);
    expect(pushedTo(app, DEVICE)).toHaveLength(1);
  });
});
