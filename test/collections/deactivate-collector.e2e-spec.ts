import { afterEach, describe, expect, it } from 'vitest';
import { nextIp } from '@test/support/auth-flow.js';
import {
  HEADERS,
  assignNewLoan,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

let seedSeq = 0;

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
function nextIdentity(): { phone: string; nationalId: string } {
  seedSeq += 1;
  const suffix = String(seedSeq).padStart(5, '0');
  return { phone: `+5730060${suffix}`, nationalId: `8${suffix}` };
}

/** Invita a un segundo cobrador al mismo negocio, destino de las reasignaciones. */
async function inviteSecondCollector(
  testApp: TestApp,
  business: SeededBusiness,
): Promise<string> {
  const portfolios = await testApp.http
    .get('/portfolios')
    .set('Cookie', business.ownerCookie)
    .set('X-Forwarded-For', nextIp());
  const generalPortfolio = (portfolios.body as { id: string }[])[0];
  if (generalPortfolio === undefined) {
    throw new Error(
      'el prestamista nuevo debería nacer con la cartera General',
    );
  }
  const identity = nextIdentity();
  const inviteResponse = await testApp.http
    .post('/memberships')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      phone: identity.phone,
      fullName: 'Segundo Cobrador',
      nationalId: identity.nationalId,
      contactEmail: `cobrador-${identity.nationalId}@example.com`,
      roles: ['COLLECTOR'],
      portfolioId: generalPortfolio.id,
    });
  expect(inviteResponse.status).toBe(201);
  return (inviteResponse.body as { membership: { id: string } }).membership.id;
}

describe('POST /collectors/:id/deactivate', () => {
  it('reasigna el préstamo activo al cobrador nuevo y da de baja al anterior', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);
    const loanId = await assignNewLoan(app, business);
    const newCollectorId = await inviteSecondCollector(app, business);

    const response = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        reassignments: [{ loanId, collectorMembershipId: newCollectorId }],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: business.collectorMembershipId,
      status: 'INACTIVE',
      reassignedLoans: 1,
    });

    const history = await app.http
      .get(`/loans/${loanId}/collection-assignments`)
      .set('Cookie', business.ownerCookie);
    const assignments = history.body as {
      collectorMembershipId: string;
      effectiveTo: string | null;
    }[];
    expect(assignments).toHaveLength(2);
    const open = assignments.find(
      (assignment) => assignment.effectiveTo === null,
    );
    expect(open?.collectorMembershipId).toBe(newCollectorId);
  });

  it('sin préstamos asignados, confirma la baja sin reasignar nada', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reassignments: [] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: business.collectorMembershipId,
      status: 'INACTIVE',
      reassignedLoans: 0,
    });
  });

  it('repetir la baja de un cobrador ya inactivo sigue confirmando, sin fallar', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);
    await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reassignments: [] });

    const again = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reassignments: [] });

    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({
      status: 'INACTIVE',
      reassignedLoans: 0,
    });
  });

  it('la ruta genérica de membresías rechaza a un cobrador', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post(`/memberships/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('rechaza una reasignación que no cubre el préstamo activo del cobrador', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);
    await assignNewLoan(app, business);

    const response = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ reassignments: [] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('rechaza reasignar un préstamo al mismo cobrador que se da de baja', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);
    const loanId = await assignNewLoan(app, business);

    const response = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({
        reassignments: [
          { loanId, collectorMembershipId: business.collectorMembershipId },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('con solo el rol COLLECTOR responde 403', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await app.http
      .post(`/collectors/${business.collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({ reassignments: [] });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });
});
