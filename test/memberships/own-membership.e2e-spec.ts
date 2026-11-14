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

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

describe('GET /memberships/me', () => {
  it('al dueño le devuelve su membresía con el rol OWNER', async () => {
    app = await startTestApp(START);
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const response = await app.http
      .get('/memberships/me')
      .set(HEADERS)
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body.roles).toContain('OWNER');
    expect(response.body.status).toBe('ACTIVE');
  });

  it('a un cobrador también le responde, con su membresía y su cartera', async () => {
    app = await startTestApp(START);
    const { collectorCookie, collectorMembershipId } =
      await seedBusinessWithCollector(app);

    const response = await app.http
      .get('/memberships/me')
      .set(HEADERS)
      .set('Cookie', collectorCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: collectorMembershipId,
      roles: ['COLLECTOR'],
    });
    expect(response.body.portfolioId).not.toBeNull();
  });

  it('sin sesión responde 401', async () => {
    app = await startTestApp(START);

    const response = await app.http.get('/memberships/me').set(HEADERS);

    expect(response.status).toBe(401);
  });
});
