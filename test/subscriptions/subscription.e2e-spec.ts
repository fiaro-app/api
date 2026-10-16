import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import {
  HEADERS,
  seedBusinessWithCollector,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD = 'contraseña-de-prueba-1';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Registra un negocio nuevo y devuelve la cookie de su dueña. */
async function registerOwner(testApp: TestApp): Promise<string> {
  const phone = '+573007090001';
  const response = await testApp.http.post('/register').set(HEADERS).send({
    phone,
    fullName: 'Dueña Suscrita',
    password: PASSWORD,
    nationalId: '70900001',
    businessName: 'Negocio con plan',
  });
  expect(response.status).toBe(201);
  return cookieOf(await signIn(testApp, { phone, password: PASSWORD }));
}

function getSubscription(testApp: TestApp, cookie: string) {
  return testApp.http
    .get('/subscription')
    .set(HEADERS)
    .set('X-Forwarded-For', nextIp())
    .set('Cookie', cookie);
}

describe('GET /subscription', () => {
  it('todo negocio nace con una prueba de 30 días y su uso', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const cookie = await registerOwner(app);

    const response = await getSubscription(app, cookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      planCode: 'TRIAL',
      status: 'ACTIVE',
      daysRemaining: 30,
      graceDaysRemaining: 0,
      isReadOnly: false,
      limits: {
        maxActiveLenders: 1,
        maxCollectors: 5,
        maxAdmins: 3,
        maxPortfolios: 4,
        maxActiveLoans: null,
      },
      // La dueña nace con rol COLLECTOR (D-78), pero no ocupa cupo de cobrador.
      usage: {
        activeLenders: 1,
        activeCollectors: 0,
        activeAdmins: 1,
        activeLoans: 0,
      },
    });
    expect(await app.prisma.subscription.count()).toBe(1);
  });

  it('pasa a GRACE_PERIOD y a READ_ONLY según el fin del período, sin bloquear la lectura', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const cookie = await registerOwner(app);
    const setEndsIn = async (days: number) => {
      await app?.prisma.subscription.updateMany({
        data: { currentPeriodEndsAt: new Date(Date.now() + days * DAY_MS) },
      });
    };

    await setEndsIn(-2);
    const grace = await getSubscription(app, cookie);
    await setEndsIn(-30);
    const readOnly = await getSubscription(app, cookie);

    expect(grace.body).toMatchObject({
      status: 'GRACE_PERIOD',
      daysRemaining: 0,
      graceDaysRemaining: 5,
      isReadOnly: false,
    });
    expect(readOnly.status).toBe(200);
    expect(readOnly.body).toMatchObject({
      status: 'READ_ONLY',
      isReadOnly: true,
    });
  });

  it('un cobrador también puede verla', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await getSubscription(app, business.collectorCookie);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ planCode: 'TRIAL' });
  });

  it('responde 404 si el negocio no tiene suscripción', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const cookie = await registerOwner(app);
    await app.prisma.subscription.deleteMany();

    const response = await getSubscription(app, cookie);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('sin sesión responde 401', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });

    const response = await app.http
      .get('/subscription')
      .set(HEADERS)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(401);
  });
});
