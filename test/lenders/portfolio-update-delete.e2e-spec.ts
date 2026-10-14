import { afterEach, describe, expect, it } from 'vitest';
import { v7 as uuidv7 } from 'uuid';
import {
  HEADERS,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;
let inviteSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

async function createPortfolio(
  testApp: TestApp,
  business: SeededBusiness,
  name: string,
): Promise<string> {
  const response = await testApp.http
    .post('/portfolios')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({ name });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
}

/** Invita a un cobrador nuevo directamente a la cartera dada. */
async function inviteCollector(
  testApp: TestApp,
  business: SeededBusiness,
  portfolioId: string,
): Promise<string> {
  inviteSeq += 1;
  const suffix = String(inviteSeq).padStart(5, '0');
  const response = await testApp.http
    .post('/memberships')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      phone: `+5730070${suffix}`,
      fullName: 'Cobrador de Zona',
      nationalId: `7${suffix}`,
      contactEmail: `cobrador-7${suffix}@example.com`,
      roles: ['COLLECTOR'],
      portfolioId,
    });
  expect(response.status).toBe(201);
  return (response.body as { membership: { id: string } }).membership.id;
}

function patch(testApp: TestApp, cookie: string, id: string, name: string) {
  return testApp.http
    .patch(`/portfolios/${id}`)
    .set(HEADERS)
    .set('Cookie', cookie)
    .send({ name });
}

function remove(testApp: TestApp, cookie: string, id: string) {
  return testApp.http
    .delete(`/portfolios/${id}`)
    .set(HEADERS)
    .set('Cookie', cookie);
}

async function listNames(testApp: TestApp, cookie: string): Promise<string[]> {
  const response = await testApp.http
    .get('/portfolios')
    .set(HEADERS)
    .set('Cookie', cookie);
  return (response.body as { name: string }[]).map((item) => item.name);
}

describe('PATCH /portfolios/:id', () => {
  it('renombra la cartera', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const id = await createPortfolio(app, business, 'Zona Norte');

    const response = await patch(app, business.ownerCookie, id, 'Zona Sur');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id,
      name: 'Zona Sur',
      isDefault: false,
    });
    expect(await listNames(app, business.ownerCookie)).toContain('Zona Sur');
  });

  it('responde 409 si otra cartera del prestamista ya usa el nombre', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    await createPortfolio(app, business, 'Zona Norte');
    const id = await createPortfolio(app, business, 'Zona Sur');

    const response = await patch(app, business.ownerCookie, id, 'Zona Norte');

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
  });

  it('responde 404 para una cartera de otro prestamista y para un id inexistente', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const other = await seedBusinessWithCollector(app);
    const foreignId = await createPortfolio(app, other, 'Zona Ajena');

    const foreign = await patch(
      app,
      business.ownerCookie,
      foreignId,
      'Zona Nueva',
    );
    const missing = await patch(
      app,
      business.ownerCookie,
      uuidv7(),
      'Zona Nueva',
    );

    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it('responde 400 con un nombre vacío y 403 a un cobrador', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const id = await createPortfolio(app, business, 'Zona Norte');

    const empty = await patch(app, business.ownerCookie, id, '');
    const collector = await patch(
      app,
      business.collectorCookie,
      id,
      'Zona Sur',
    );

    expect(empty.status).toBe(400);
    expect(collector.status).toBe(403);
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp(START);

    const response = await app.http
      .patch(`/portfolios/${uuidv7()}`)
      .set(HEADERS)
      .send({ name: 'Zona Nueva' });

    expect(response.status).toBe(401);
  });
});

describe('DELETE /portfolios/:id', () => {
  it('borra una cartera sin cobradores asignados', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const id = await createPortfolio(app, business, 'Zona Norte');

    const response = await remove(app, business.ownerCookie, id);

    expect(response.status).toBe(204);
    expect(await listNames(app, business.ownerCookie)).not.toContain(
      'Zona Norte',
    );
  });

  it('responde 409 con la cartera por defecto', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const portfolios = await app.http
      .get('/portfolios')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    const general = (
      portfolios.body as { id: string; isDefault: boolean }[]
    ).find((item) => item.isDefault);

    const response = await remove(app, business.ownerCookie, general?.id ?? '');

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
  });

  it('responde 409 con un cobrador activo asignado, y deja borrarla cuando ya no lo está', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const id = await createPortfolio(app, business, 'Zona Norte');
    const collectorId = await inviteCollector(app, business, id);

    const blocked = await remove(app, business.ownerCookie, id);
    const deactivated = await app.http
      .post(`/collectors/${collectorId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reassignments: [] });
    const allowed = await remove(app, business.ownerCookie, id);

    expect(blocked.status).toBe(409);
    expect(deactivated.status).toBe(200);
    expect(allowed.status).toBe(204);
  });

  it('responde 404 para una cartera de otro prestamista', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const other = await seedBusinessWithCollector(app);
    const foreignId = await createPortfolio(app, other, 'Zona Ajena');

    const response = await remove(app, business.ownerCookie, foreignId);

    expect(response.status).toBe(404);
    expect(await listNames(app, other.ownerCookie)).toContain('Zona Ajena');
  });

  it('responde 403 a un cobrador, 400 con un id inválido y 401 sin sesión', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const id = await createPortfolio(app, business, 'Zona Norte');

    const collector = await remove(app, business.collectorCookie, id);
    const badId = await remove(app, business.ownerCookie, 'no-es-uuid');
    const anonymous = await app.http.delete(`/portfolios/${id}`).set(HEADERS);

    expect(collector.status).toBe(403);
    expect(badId.status).toBe(400);
    expect(anonymous.status).toBe(401);
  });
});
