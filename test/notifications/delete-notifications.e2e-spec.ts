import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import {
  assignNewLoan,
  HEADERS,
  seedAssignedLoan,
} from '@test/support/notification-seed.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function list(testApp: TestApp, cookie: string) {
  const response = await httpQuery(testApp.http, '/notifications')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({});
  return response.body as { data: { id: string }[]; meta: { total: number } };
}

function call(
  testApp: TestApp,
  method: 'post' | 'delete',
  path: string,
  cookie: string,
  body?: object,
) {
  const request = testApp.http[method](path)
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie);
  return body === undefined ? request : request.send(body);
}

describe('borrar notificaciones', () => {
  it('borra una por id, solo las leídas y todas, sin tocar las de otra persona', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedAssignedLoan(app);
    await assignNewLoan(app, business);
    const before = await list(app, business.collectorCookie);
    expect(before.meta.total).toBe(2);
    const [first, second] = before.data;
    if (first === undefined || second === undefined) {
      throw new Error('el cobrador debería tener dos notificaciones');
    }

    const stranger = await call(
      app,
      'delete',
      `/notifications/${first.id}`,
      business.ownerCookie,
    );
    expect(stranger.status).toBe(404);

    const removed = await call(
      app,
      'delete',
      `/notifications/${first.id}`,
      business.collectorCookie,
    );
    expect(removed.status).toBe(204);
    expect(
      (
        await call(
          app,
          'delete',
          `/notifications/${first.id}`,
          business.collectorCookie,
        )
      ).status,
    ).toBe(404);

    const unreadKept = await call(
      app,
      'post',
      '/notifications/clear',
      business.collectorCookie,
      { onlyRead: true },
    );
    expect(unreadKept.body).toEqual({ deleted: 0 });
    await call(
      app,
      'post',
      `/notifications/${second.id}/read`,
      business.collectorCookie,
    );
    const readCleared = await call(
      app,
      'post',
      '/notifications/clear',
      business.collectorCookie,
      { onlyRead: true },
    );
    expect(readCleared.body).toEqual({ deleted: 1 });

    const ownerBefore = (await list(app, business.ownerCookie)).meta.total;
    const all = await call(
      app,
      'post',
      '/notifications/clear',
      business.collectorCookie,
    );
    expect(all.body).toEqual({ deleted: 0 });
    expect((await list(app, business.collectorCookie)).meta.total).toBe(0);
    expect((await list(app, business.ownerCookie)).meta.total).toBe(
      ownerBefore,
    );
  });
});
