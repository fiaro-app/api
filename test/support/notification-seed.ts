import { expect } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import type { TestApp } from '@test/support/test-app.js';

/**
 * Preparación compartida de las pruebas de notificaciones: un negocio con su dueña, un cobrador
 * invitado y préstamos asignados. Pasa por las mismas rutas que usaría la app, para que cada
 * prueba hable de notificaciones y no de altas.
 */

/** Cabeceras de estas pruebas: su `Origin` debe estar en `CORS_ORIGINS` (`startTestApp`). */
export const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3040',
};

const OWNER_PASSWORD = 'contraseña-de-prueba-1';
const COLLECTOR_PASSWORD = 'contraseña-nueva-del-cobrador-1';

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
let identitySeq = 0;
function nextIdentity(): { phone: string; nationalId: string } {
  identitySeq += 1;
  const suffix = String(identitySeq).padStart(5, '0');
  return { phone: `+5730040${suffix}`, nationalId: `4${suffix}` };
}

/** Un cliente nuevo por préstamo: la cédula de cada cliente es única dentro del prestamista. */
let clientSeq = 0;

/** Un negocio con su dueña (OWNER, LENDER y COLLECTOR, D-78) y un cobrador invitado. */
export interface SeededBusiness {
  readonly ownerPhone: string;
  readonly ownerCookie: string;
  readonly collectorPhone: string;
  readonly collectorCookie: string;
  readonly collectorMembershipId: string;
}

/**
 * Registra el negocio, invita a un cobrador (solo `COLLECTOR`, en la cartera General) y deja a los
 * dos con sesión. El cobrador entra con su contraseña temporal y la cambia antes de usar la app
 * (PRODUCT.md §8): la cookie que sirve es la de esa respuesta.
 *
 * @param testApp - La aplicación de la prueba.
 */
export async function seedBusinessWithCollector(
  testApp: TestApp,
): Promise<SeededBusiness> {
  const owner = nextIdentity();
  const registerResponse = await testApp.http
    .post('/register')
    .set(HEADERS)
    .send({
      phone: owner.phone,
      fullName: 'Marta Ríos (dueña de prueba de notificaciones)',
      password: OWNER_PASSWORD,
      nationalId: owner.nationalId,
      businessName: 'Negocio de prueba de notificaciones',
    });
  expect(registerResponse.status).toBe(201);
  const ownerSignIn = await signIn(testApp, {
    phone: owner.phone,
    password: OWNER_PASSWORD,
  });
  const ownerCookie = cookieOf(ownerSignIn);

  const portfolios = await testApp.http
    .get('/portfolios')
    .set('Cookie', ownerCookie)
    .set('X-Forwarded-For', nextIp());
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
  const changePasswordResponse = await testApp.http
    .post('/auth/change-password')
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookieOf(collectorSignIn))
    .send({
      currentPassword: tempPassword,
      newPassword: COLLECTOR_PASSWORD,
    });
  expect(changePasswordResponse.status).toBe(200);

  return {
    ownerPhone: owner.phone,
    ownerCookie,
    collectorPhone: collector.phone,
    collectorCookie: cookieOf(changePasswordResponse),
    collectorMembershipId,
  };
}

/**
 * Crea un cliente con un préstamo y se lo asigna al cobrador. El alta de la asignación es lo que
 * dispara "préstamo asignado" (D-87).
 *
 * @param testApp - La aplicación de la prueba.
 * @param business - El negocio que ya tiene al cobrador.
 * @returns El id del préstamo.
 */
export async function assignNewLoan(
  testApp: TestApp,
  business: SeededBusiness,
  options: { readonly startDate?: string } = {},
): Promise<string> {
  const startDate = options.startDate ?? '2026-10-01';
  clientSeq += 1;
  const clientResponse = await testApp.http
    .post('/clients')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      nationalId: `9${String(clientSeq).padStart(8, '0')}`,
      fullName: 'Deudor de Prueba',
      occupation: 'Comerciante',
      phone: '+573009998877',
      address: 'Calle falsa 123',
    });
  expect(clientResponse.status).toBe(201);

  const loanResponse = await testApp.http
    .post('/loans')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      clientId: clientResponse.body.id,
      principalAmount: 20_000,
      installmentCount: 2,
      installmentValue: 10_000,
      totalPayable: 20_000,
      frequency: 'DAILY',
      startDate,
    });
  const loanId = loanResponse.body.id as string;

  const assignmentResponse = await testApp.http
    .post(`/loans/${loanId}/collection-assignments`)
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      collectorMembershipId: business.collectorMembershipId,
      effectiveFrom: startDate,
    });
  expect(assignmentResponse.status).toBe(201);
  return loanId;
}

/**
 * Negocio con un cobrador y un préstamo ya asignado: lo que hacen casi todas las pruebas de
 * notificaciones antes de llegar a lo que quieren probar.
 *
 * @param testApp - La aplicación de la prueba.
 */
export async function seedAssignedLoan(
  testApp: TestApp,
): Promise<SeededBusiness & { loanId: string }> {
  const business = await seedBusinessWithCollector(testApp);
  const loanId = await assignNewLoan(testApp, business);
  return { ...business, loanId };
}

/**
 * Marca el correo de contacto de una persona como verificado. El flujo de verificación tiene sus
 * propias pruebas; aquí solo importa el resultado, que es lo que decide si sale un correo.
 *
 * @param testApp - La aplicación de la prueba.
 * @param phone - El celular de la persona.
 * @param email - El correo de contacto que queda verificado.
 */
export async function verifyContactEmail(
  testApp: TestApp,
  phone: string,
  email: string,
): Promise<void> {
  await testApp.prisma.user.update({
    where: { phone },
    data: { contactEmail: email, contactEmailVerified: true },
  });
}
