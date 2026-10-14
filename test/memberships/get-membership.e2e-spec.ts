import { v7 as uuidv7 } from 'uuid';
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

describe('GET /memberships/:id', () => {
  it('devuelve el colaborador con su nombre y celular, igual que una fila del listado', async () => {
    app = await startTestApp(START);
    const { ownerCookie, collectorMembershipId, collectorPhone } =
      await seedBusinessWithCollector(app);

    const response = await app.http
      .get(`/memberships/${collectorMembershipId}`)
      .set(HEADERS)
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: collectorMembershipId,
      roles: ['COLLECTOR'],
      status: 'ACTIVE',
      fullName: 'Carlos Cobrador',
      phone: collectorPhone,
    });
    expect(response.body.portfolioId).not.toBeNull();
  });

  it('responde 404 para una membresía que no existe', async () => {
    app = await startTestApp(START);
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const response = await app.http
      .get(`/memberships/${uuidv7()}`)
      .set(HEADERS)
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('responde 404 para la membresía de otro prestamista', async () => {
    app = await startTestApp(START);
    const { collectorMembershipId } = await seedBusinessWithCollector(app);
    const { ownerCookie: otherOwnerCookie } =
      await seedBusinessWithCollector(app);

    const response = await app.http
      .get(`/memberships/${collectorMembershipId}`)
      .set(HEADERS)
      .set('Cookie', otherOwnerCookie);

    expect(response.status).toBe(404);
  });

  it('responde 403 a un cobrador', async () => {
    app = await startTestApp(START);
    const { collectorCookie, collectorMembershipId } =
      await seedBusinessWithCollector(app);

    const response = await app.http
      .get(`/memberships/${collectorMembershipId}`)
      .set(HEADERS)
      .set('Cookie', collectorCookie);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('responde 400 si el id no es un UUID', async () => {
    app = await startTestApp(START);
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const response = await app.http
      .get('/memberships/no-es-uuid')
      .set(HEADERS)
      .set('Cookie', ownerCookie);

    expect(response.status).toBe(400);
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp(START);

    const response = await app.http.get(`/memberships/${uuidv7()}`);

    expect(response.status).toBe(401);
  });
});
