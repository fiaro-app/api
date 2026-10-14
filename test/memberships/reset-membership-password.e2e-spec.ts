import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, signIn } from '@test/support/auth-flow.js';
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
  return { phone: `+5730042${suffix}`, nationalId: `6${suffix}` };
}

const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

/**
 * Registra un negocio nuevo y un cobrador aparte, con la contraseña propia del cobrador ya
 * puesta (no la temporal): deja las dos sesiones listas para pedir un reset entre ellas.
 */
async function seedBusinessWithCollector(testApp: TestApp): Promise<{
  ownerCookie: string;
  ownerMembershipId: string;
  collectorCookie: string;
  collectorPhone: string;
  collectorMembershipId: string;
}> {
  const owner = nextIdentity();
  const registerResponse = await testApp.http
    .post('/register')
    .set(HEADERS)
    .send({
      phone: owner.phone,
      fullName: 'Marta Ríos (dueña de prueba de reset)',
      password: 'contraseña-de-prueba-1',
      nationalId: owner.nationalId,
      businessName: 'Negocio de prueba de reset',
    });
  expect(registerResponse.status).toBe(201);
  const ownerMembershipId = (
    registerResponse.body as { membership: { id: string } }
  ).membership.id;
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
    ownerMembershipId,
    collectorCookie,
    collectorPhone: collector.phone,
    collectorMembershipId,
  };
}

describe('POST /memberships/:id/reset-password', () => {
  it('con rol OWNER genera una temporal nueva que de verdad sirve para entrar', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie, collectorPhone, collectorMembershipId } =
      await seedBusinessWithCollector(app);

    const reset = await app.http
      .post(`/memberships/${collectorMembershipId}/reset-password`)
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({});

    expect(reset.status).toBe(200);
    const tempPassword = (reset.body as { tempPassword: string }).tempPassword;
    expect(tempPassword).toEqual(expect.any(String));

    const signInWithNew = await signIn(app, {
      phone: collectorPhone,
      password: tempPassword,
    });
    expect(signInWithNew.status).toBe(200);
  });

  it('no deja restablecerse la contraseña a sí mismo', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie, ownerMembershipId } =
      await seedBusinessWithCollector(app);

    const response = await app.http
      .post(`/memberships/${ownerMembershipId}/reset-password`)
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('con solo el rol COLLECTOR responde 403', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { collectorCookie, ownerMembershipId } =
      await seedBusinessWithCollector(app);

    const response = await app.http
      .post(`/memberships/${ownerMembershipId}/reset-password`)
      .set(HEADERS)
      .set('Cookie', collectorCookie)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('con una membresía que no existe responde 404', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const { ownerCookie } = await seedBusinessWithCollector(app);

    const response = await app.http
      .post('/memberships/00000000-0000-0000-0000-000000000000/reset-password')
      .set(HEADERS)
      .set('Cookie', ownerCookie)
      .send({});

    expect(response.status).toBe(404);
  });
});
