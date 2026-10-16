import { afterEach, describe, expect, it } from 'vitest';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function create(testApp: TestApp, cookie: string, name: string) {
  return testApp.http
    .post('/portfolios')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({ name });
}

describe('máximo de carteras por negocio', () => {
  it('permite 4 con la General y rechaza la quinta; borrar una libera el cupo', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const ids: string[] = [];
    for (const name of ['Norte', 'Sur', 'Centro']) {
      const response = await create(app, ownerCookie, name);
      expect(response.status).toBe(201);
      ids.push((response.body as { id: string }).id);
    }

    const fifth = await create(app, ownerCookie, 'Oriente');
    expect(fifth.status).toBe(403);
    expect(fifth.body).toMatchObject({
      code: 'PLAN_LIMIT_REACHED',
      errorCode: 'B007A',
    });

    const removed = await app.http
      .delete(`/portfolios/${ids[0] ?? ''}`)
      .set(HEADERS)
      .set('Cookie', ownerCookie);
    expect(removed.status).toBe(204);
    expect((await create(app, ownerCookie, 'Oriente')).status).toBe(201);
  });
});
