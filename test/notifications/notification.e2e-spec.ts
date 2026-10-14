import { afterEach, describe, expect, it } from 'vitest';
import { httpQuery } from '@test/support/security-app.js';
import { HEADERS, seedAssignedLoan } from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

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
