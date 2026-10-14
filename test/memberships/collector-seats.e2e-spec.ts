import { afterEach, describe, expect, it } from 'vitest';
import {
  HEADERS,
  seedAssignedLoan,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const START = { env: { CORS_ORIGINS: HEADERS.Origin } };

function started(): TestApp {
  if (app === undefined) {
    throw new Error('la prueba debe arrancar la aplicación primero');
  }
  return app;
}

function codeOf(
  responses: { status: number; body: { code?: string } }[],
  status: number,
) {
  return responses.find((response) => response.status === status)?.body.code;
}

/** Un celular y una cédula que no usa ningún otro archivo de pruebas. */
let seq = 0;
function identity(): { phone: string; nationalId: string } {
  seq += 1;
  const suffix = String(seq).padStart(5, '0');
  return { phone: `+5731180${suffix}`, nationalId: `81${suffix}` };
}

async function generalPortfolio(
  testApp: TestApp,
  business: SeededBusiness,
): Promise<string> {
  const response = await testApp.http
    .get('/portfolios')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie);
  const [general] = response.body as { id: string }[];
  if (general === undefined) {
    throw new Error(
      'el prestamista nuevo debería nacer con la cartera General',
    );
  }
  return general.id;
}

async function setCollectorLimit(
  testApp: TestApp,
  business: SeededBusiness,
  maxCollectors: number,
): Promise<void> {
  const owner = await testApp.prisma.user.findUniqueOrThrow({
    where: { phone: business.ownerPhone },
    select: {
      memberships: { select: { lender: { select: { tenantId: true } } } },
    },
  });
  const [membership] = owner.memberships;
  if (membership === undefined) {
    throw new Error('la dueña debería tener su membresía');
  }
  await testApp.prisma.subscription.update({
    where: { tenantId: membership.lender.tenantId },
    data: { maxCollectors },
  });
}

function invite(
  testApp: TestApp,
  business: SeededBusiness,
  portfolioId: string,
  person: { phone: string; nationalId: string },
) {
  return testApp.http
    .post('/memberships')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      ...person,
      contactEmail: `cobrador-${person.phone.slice(1)}@example.com`,
      fullName: 'Cobrador Concurrente',
      roles: ['COLLECTOR'],
      portfolioId,
    });
}

describe('Cupos de cobrador del plan', () => {
  it('con altas simultáneas nunca se pasa del límite, y el dueño no ocupa cupo', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const portfolioId = await generalPortfolio(app, business);
    await setCollectorLimit(app, business, 3);

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        invite(started(), business, portfolioId, identity()),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 201, 403, 403, 403, 403]);
    expect(codeOf(responses, 403)).toBe('PLAN_LIMIT_REACHED');
    const subscription = await app.http
      .get('/subscription')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(subscription.body.usage.activeCollectors).toBe(3);
  });

  it('reactivar respeta el límite; dar de baja libera el cupo', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const portfolioId = await generalPortfolio(app, business);
    await setCollectorLimit(app, business, 1);
    const deactivated = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reassignments: [] });
    expect(deactivated.status).toBe(200);
    expect((await invite(app, business, portfolioId, identity())).status).toBe(
      201,
    );

    const reactivated = await app.http
      .post(`/memberships/${business.collectorMembershipId}/reactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);

    expect(reactivated.status).toBe(403);
    expect(reactivated.body.code).toBe('PLAN_LIMIT_REACHED');
    await setCollectorLimit(app, business, 2);
    const retried = await app.http
      .post(`/memberships/${business.collectorMembershipId}/reactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(retried.status).toBe(200);
    expect(retried.body.status).toBe('ACTIVE');
  });
});

describe('Cédula única por negocio', () => {
  it('altas simultáneas con la misma cédula y distinto celular crean una sola', async () => {
    app = await startTestApp(START);
    const business = await seedBusinessWithCollector(app);
    const portfolioId = await generalPortfolio(app, business);
    const { nationalId } = identity();

    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        invite(started(), business, portfolioId, { ...identity(), nationalId }),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409, 409,
    ]);
    expect(codeOf(responses, 409)).toBe('COLLABORATOR_NATIONAL_ID_TAKEN');
  });

  it('la misma persona puede trabajar para otro negocio', async () => {
    app = await startTestApp(START);
    const first = await seedBusinessWithCollector(app);
    const second = await seedBusinessWithCollector(app);
    const person = identity();

    const inFirst = await invite(
      app,
      first,
      await generalPortfolio(app, first),
      person,
    );
    const inSecond = await invite(
      app,
      second,
      await generalPortfolio(app, second),
      person,
    );

    expect(inFirst.status).toBe(201);
    expect(inSecond.status).toBe(201);
    expect(inSecond.body.tempPassword).toBeNull();
  });
});

describe('DELETE /memberships/:id', () => {
  it('borra a un cobrador sin historial y rechaza uno con historial', async () => {
    app = await startTestApp(START);
    const business = await seedAssignedLoan(app);
    const portfolioId = await generalPortfolio(app, business);
    const mistaken = await invite(app, business, portfolioId, identity());
    const mistakenId = (mistaken.body as { membership: { id: string } })
      .membership.id;

    const deleted = await app.http
      .delete(`/memberships/${mistakenId}`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    const withHistory = await app.http
      .delete(`/memberships/${business.collectorMembershipId}`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);

    expect(deleted.status).toBe(204);
    expect(withHistory.status).toBe(409);
    expect(withHistory.body.code).toBe('COLLECTOR_HAS_HISTORY');
  });
});
