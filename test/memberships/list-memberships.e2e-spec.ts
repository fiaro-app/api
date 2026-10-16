import { LEGAL_ACCEPTANCE } from '@test/support/legal-acceptance.js';
import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, signIn } from '@test/support/auth-flow.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

let app: TestApp | undefined;
let seedSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
function nextIdentity(): { phone: string; nationalId: string } {
  seedSeq += 1;
  const suffix = String(seedSeq).padStart(5, '0');
  return { phone: `+5730041${suffix}`, nationalId: `5${suffix}` };
}

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

/** Registra un negocio nuevo y un cobrador aparte, con sus dos cookies de sesión. */
async function seedBusinessWithCollector(testApp: TestApp): Promise<{
  ownerCookie: string;
  collectorCookie: string;
  collectorPhone: string;
  collectorMembershipId: string;
}> {
  const owner = nextIdentity();
  const registerResponse = await testApp.http
    .post('/register')
    .set(HEADERS)
    .send({
      ...LEGAL_ACCEPTANCE,
      phone: owner.phone,
      fullName: 'Marta Ríos (dueña de prueba de membresías)',
      password: 'contraseña-de-prueba-1',
      nationalId: owner.nationalId,
      businessName: 'Negocio de prueba de membresías',
    });
  expect(registerResponse.status).toBe(201);
  const ownerCookie = cookieOf(
    await signIn(testApp, {
      phone: owner.phone,
      password: 'contraseña-de-prueba-1',
    }),
  );

  const portfolios = await testApp.http
    .get('/portfolios')
    .set(HEADERS)
    .set('Cookie', ownerCookie);
  const generalPortfolio = (portfolios.body as { id: string }[])[0];
  if (generalPortfolio === undefined) {
    throw new Error(
      'el prestamista nuevo debería nacer con la cartera General',
    );
  }

  const collector = nextIdentity();
  const inviteResponse = await testApp.http
    .post('/memberships')
    .set(HEADERS)
    .set('Cookie', ownerCookie)
    .send({
      phone: collector.phone,
      fullName: 'Carlos Cobrador',
      nationalId: collector.nationalId,
      contactEmail: `cobrador-${collector.nationalId}@example.com`,
      roles: ['COLLECTOR'],
      portfolioId: generalPortfolio.id,
    });
  expect(inviteResponse.status).toBe(201);
  const collectorMembershipId = (
    inviteResponse.body as { membership: { id: string } }
  ).membership.id;
  const tempPassword = (inviteResponse.body as { tempPassword: string })
    .tempPassword;
  const collectorSignIn = await signIn(testApp, {
    phone: collector.phone,
    password: tempPassword,
  });
  expect(collectorSignIn.status).toBe(200);
  const tempCollectorCookie = cookieOf(collectorSignIn);

  // Contraseña temporal (mustChangePassword): toda ruta que no sea pública da 403
  // PASSWORD_CHANGE_REQUIRED hasta cambiarla, y el cambio emite una cookie nueva.
  const changePassword = await testApp.http
    .post('/auth/change-password')
    .set(HEADERS)
    .set('Cookie', tempCollectorCookie)
    .send({
      currentPassword: tempPassword,
      newPassword: 'contraseña-propia-del-cobrador-1',
    });
  expect(changePassword.status).toBe(200);
  const collectorCookie = cookieOf(changePassword);

  return {
    ownerCookie,
    collectorCookie,
    collectorPhone: collector.phone,
    collectorMembershipId,
  };
}

describe('QUERY /memberships', () => {
  it('con rol OWNER lista a los colaboradores, con nombre y celular', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie, collectorPhone } =
      await seedBusinessWithCollector(app);

    const response = await httpQuery(app.http, '/memberships')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({ page: 1, pageSize: 20 });

    expect(response.status).toBe(200);
    const body = response.body as {
      data: { fullName: string; phone: string; roles: string[] }[];
      meta: { total: number };
    };
    expect(body.meta.total).toBe(2);
    const collectorEntry = body.data.find(
      (entry) => entry.phone === collectorPhone,
    );
    expect(collectorEntry).toMatchObject({
      fullName: 'Carlos Cobrador',
      roles: ['COLLECTOR'],
    });
  });

  it('filtra por rol', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedBusinessWithCollector(app);

    // LENDER, no COLLECTOR: la dueña nace con los tres roles (D-78), así que filtrar por
    // COLLECTOR traería también a la dueña, no solo al cobrador invitado.
    const response = await httpQuery(app.http, '/memberships')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({ page: 1, pageSize: 20, role: 'LENDER' });

    const body = response.body as { data: { fullName: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.fullName).toBe(
      'Marta Ríos (dueña de prueba de membresías)',
    );
  });

  it('filtra por estado', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie, collectorMembershipId } =
      await seedBusinessWithCollector(app);
    // El cobrador es la membresía a desactivar, así que usa su propia ruta (D-97): sin préstamos
    // asignados, reassignments vacío solo confirma la baja.
    await app.http
      .post(`/collectors/${collectorMembershipId}/deactivate`)
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({ reassignments: [] });

    const inactive = await httpQuery(app.http, '/memberships')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({ page: 1, pageSize: 20, status: 'INACTIVE' });
    const active = await httpQuery(app.http, '/memberships')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({ page: 1, pageSize: 20, status: 'ACTIVE' });

    expect(
      (inactive.body as { data: { fullName: string }[] }).data,
    ).toHaveLength(1);
    expect((active.body as { data: { fullName: string }[] }).data).toHaveLength(
      1,
    );
  });

  it('con solo el rol COLLECTOR responde 403', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie } = await seedBusinessWithCollector(app);

    const response = await httpQuery(app.http, '/memberships')
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({ page: 1, pageSize: 20 });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });
});
