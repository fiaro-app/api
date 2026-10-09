import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assignNewLoan,
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Un negocio cuyo cobrador recibió una notificación de «préstamo asignado» por cada préstamo. */
async function seedCollectorWithNotifications(testApp: TestApp, loans: number) {
  const business = await seedBusinessWithCollector(testApp);
  for (let index = 0; index < loans; index += 1) {
    await assignNewLoan(testApp, business);
  }
  return business;
}

async function unreadCount(
  testApp: TestApp,
  cookie: string,
  query = '',
): Promise<number> {
  const response = await testApp.http
    .get(`/notifications/unread-count${query}`)
    .set(HEADERS)
    .set('Cookie', cookie);
  expect(response.status).toBe(200);
  return (response.body as { count: number }).count;
}

describe('GET /notifications/unread-count', () => {
  it('cuenta las sin leer propias', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 3);

    expect(await unreadCount(app, collectorCookie)).toBe(3);
  });

  it('un prestamista sin notificaciones de esa persona da cero', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 1);

    expect(
      await unreadCount(app, collectorCookie, `?lenderId=${uuidv7()}`),
    ).toBe(0);
  });

  it('responde 400 si lenderId no es un UUID', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 0);

    const response = await app.http
      .get('/notifications/unread-count?lenderId=no-es-uuid')
      .set(HEADERS)
      .set('Cookie', collectorCookie);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await app.http.get('/notifications/unread-count');

    expect(response.status).toBe(401);
  });
});

describe('POST /notifications/read-all', () => {
  it('marca todas las propias, devuelve cuántas y deja el conteo en cero', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 3);

    const response = await app.http
      .post('/notifications/read-all')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ marked: 3 });
    expect(await unreadCount(app, collectorCookie)).toBe(0);
  });

  it('acepta una petición sin cuerpo y repetirla devuelve cero', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 2);

    const first = await app.http
      .post('/notifications/read-all')
      .set('Origin', HEADERS.Origin)
      .set('Cookie', collectorCookie);
    const second = await app.http
      .post('/notifications/read-all')
      .set('Origin', HEADERS.Origin)
      .set('Cookie', collectorCookie);

    expect(first.body).toEqual({ marked: 2 });
    expect(second.body).toEqual({ marked: 0 });
  });

  it('con lenderId solo marca las de ese prestamista', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 2);

    const other = await app.http
      .post('/notifications/read-all')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({ lenderId: uuidv7() });

    expect(other.body).toEqual({ marked: 0 });
    expect(await unreadCount(app, collectorCookie)).toBe(2);
  });

  it('no toca las notificaciones de otra persona', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 1);
    const { collectorCookie: otherCookie } =
      await seedCollectorWithNotifications(app, 2);

    await app.http
      .post('/notifications/read-all')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({});

    expect(await unreadCount(app, otherCookie)).toBe(2);
  });

  it('responde 400 con un campo que no declara', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedCollectorWithNotifications(app, 0);

    const response = await app.http
      .post('/notifications/read-all')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({ unreadOnly: true });

    expect(response.status).toBe(400);
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await app.http
      .post('/notifications/read-all')
      .set(HEADERS)
      .send({});

    expect(response.status).toBe(401);
  });
});
