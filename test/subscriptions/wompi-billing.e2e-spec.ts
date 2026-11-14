import { afterEach, describe, expect, it } from 'vitest';
import {
  HEADERS,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';
import {
  BILLING_ENV,
  DAY_MS,
  INTEGRITY_SECRET,
  sha,
  wompiEvent,
} from '@test/support/wompi.js';

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

function started(): TestApp {
  if (app === undefined) {
    throw new Error('la prueba debe arrancar la aplicación primero');
  }
  return app;
}

/** Un negocio con la facturación encendida. */
async function billingBusiness(): Promise<SeededBusiness> {
  app = await startTestApp({ env: BILLING_ENV });
  return await seedBusinessWithCollector(app);
}

async function checkout(business: SeededBusiness, planCode = 'PRO') {
  return await started()
    .http.post('/subscription/checkout')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({ planCode });
}

/** Lo que hace Wompi: llama sin sesión ni `Origin`. */
async function deliver(event: ReturnType<typeof wompiEvent>) {
  return await started()
    .http.post('/webhooks/wompi')
    .set('X-Event-Checksum', event.signature.checksum)
    .send(event);
}

async function subscriptionOf(business: SeededBusiness) {
  const response = await started()
    .http.get('/subscription')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie);
  return response.body as {
    planCode: string;
    status: string;
    currentPeriodEndsAt: string;
    limits: { maxCollectors: number; maxPortfolios: number };
  };
}

function createClient(business: SeededBusiness) {
  return started()
    .http.post('/clients')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({
      nationalId: `9${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
      fullName: 'Deudor de Prueba',
      occupation: 'Comerciante',
      phone: '+573009998877',
      address: 'Calle falsa 123',
    });
}

describe('POST /subscription/checkout', () => {
  it('crea la orden con el precio del plan y la firma de integridad de Wompi', async () => {
    const business = await billingBusiness();

    const response = await checkout(business, 'PRO');

    expect(response.status).toBe(201);
    const { reference, checkout: params } = response.body as {
      reference: string;
      checkout: Record<string, unknown>;
    };
    expect(params).toEqual({
      url: 'https://checkout.wompi.co/p/',
      publicKey: 'pub_test_e2e',
      currency: 'COP',
      amountInCents: 6_900_000,
      reference,
      signatureIntegrity: sha(`${reference}6900000COP${INTEGRITY_SECRET}`),
      redirectUrl: 'https://app.fiaro.test/plan',
    });
    const row = await started().prisma.subscriptionPayment.findUniqueOrThrow({
      where: { reference },
    });
    expect(row).toMatchObject({
      planCode: 'PRO',
      status: 'PENDING',
      amountInCents: 6_900_000,
    });
  });

  it('sin las llaves de Wompi responde 503 y no crea nada', async () => {
    app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
    const business = await seedBusinessWithCollector(app);

    const response = await checkout(business);

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('BILLING_UNAVAILABLE');
    expect(await app.prisma.subscriptionPayment.count()).toBe(0);
  });

  it('solo la dueña paga; la prueba no se compra y un monto del cliente no existe', async () => {
    const business = await billingBusiness();

    const asCollector = await started()
      .http.post('/subscription/checkout')
      .set(HEADERS)
      .set('Cookie', business.collectorCookie)
      .send({ planCode: 'PRO' });
    expect(asCollector.status).toBe(403);
    expect((await checkout(business, 'TRIAL')).status).toBe(400);
    const withAmount = await started()
      .http.post('/subscription/checkout')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie)
      .send({ planCode: 'PRO', amountInCents: 1 });
    expect(withAmount.status).toBe(400);
  });
});

describe('POST /webhooks/wompi', () => {
  it('un pago aprobado pasa al plan comprado y suma un mes a lo que quedaba', async () => {
    const business = await billingBusiness();
    const before = await subscriptionOf(business);
    const { reference } = (await checkout(business, 'PRO')).body as {
      reference: string;
    };

    const response = await deliver(wompiEvent(reference));

    expect(response.status).toBe(200);
    const after = await subscriptionOf(business);
    expect(after).toMatchObject({ planCode: 'PRO', status: 'ACTIVE' });
    expect(after.limits.maxCollectors).toBe(10);
    const gainedDays =
      (Date.parse(after.currentPeriodEndsAt) -
        Date.parse(before.currentPeriodEndsAt)) /
      DAY_MS;
    expect(gainedDays).toBeGreaterThanOrEqual(28);
    expect(gainedDays).toBeLessThanOrEqual(31);
    const status = await started()
      .http.get(`/subscription/checkout/${reference}`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(status.body).toMatchObject({
      reference,
      status: 'APPROVED',
      planCode: 'PRO',
    });
    expect(status.body.periodEndsAt).toBe(after.currentPeriodEndsAt);
  });

  it('un aviso repetido, aunque llegue a la vez, se aplica una sola vez', async () => {
    const business = await billingBusiness();
    const { reference } = (await checkout(business)).body as {
      reference: string;
    };
    const event = wompiEvent(reference);

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => deliver(event)),
    );

    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    expect(
      await started().prisma.subscriptionPayment.count({
        where: { status: 'APPROVED' },
      }),
    ).toBe(1);
    const once = await subscriptionOf(business);
    await deliver(event);
    expect((await subscriptionOf(business)).currentPeriodEndsAt).toBe(
      once.currentPeriodEndsAt,
    );
  });

  it('con la firma mala responde 401 y no cambia nada', async () => {
    const business = await billingBusiness();
    const { reference } = (await checkout(business)).body as {
      reference: string;
    };
    const before = await subscriptionOf(business);

    const forged = await deliver(
      wompiEvent(reference, { secret: 'otro-secreto' }),
    );
    const empty = await started().http.post('/webhooks/wompi').send({});

    expect(forged.status).toBe(401);
    expect(empty.status).toBe(401);
    expect(await subscriptionOf(business)).toEqual(before);
    expect(
      (
        await started().prisma.subscriptionPayment.findUniqueOrThrow({
          where: { reference },
        })
      ).status,
    ).toBe('PENDING');
  });

  it('un monto distinto o una referencia desconocida responden 200 pero no aprueban', async () => {
    const business = await billingBusiness();
    const { reference } = (await checkout(business)).body as {
      reference: string;
    };
    const before = await subscriptionOf(business);

    expect(
      (await deliver(wompiEvent(reference, { amountInCents: 100 }))).status,
    ).toBe(200);
    expect((await deliver(wompiEvent('fiaro-no-existe'))).status).toBe(200);

    expect(await subscriptionOf(business)).toEqual(before);
    expect(
      (
        await started().prisma.subscriptionPayment.findUniqueOrThrow({
          where: { reference },
        })
      ).status,
    ).toBe('PENDING');
  });

  it('un pago rechazado cierra la orden y deja la suscripción como estaba', async () => {
    const business = await billingBusiness();
    const { reference } = (await checkout(business)).body as {
      reference: string;
    };
    const before = await subscriptionOf(business);

    const declined = wompiEvent(reference, { status: 'DECLINED' });
    expect((await deliver(declined)).status).toBe(200);
    expect((await deliver(declined)).status).toBe(200);

    expect(await subscriptionOf(business)).toEqual(before);
    const status = await started()
      .http.get(`/subscription/checkout/${reference}`)
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    expect(status.body).toMatchObject({
      status: 'DECLINED',
      periodEndsAt: null,
    });
  });

  it('desde solo lectura se puede pagar, y al aprobarse el negocio vuelve a escribir', async () => {
    const business = await billingBusiness();
    await started().prisma.subscription.updateMany({
      data: { currentPeriodEndsAt: new Date(Date.now() - 10 * DAY_MS) },
    });
    expect((await createClient(business)).status).toBe(403);
    const created = await checkout(business, 'INDIVIDUAL');
    expect(created.status).toBe(201);
    const { reference } = created.body as { reference: string };

    await deliver(wompiEvent(reference, { amountInCents: 4_900_000 }));

    const after = await subscriptionOf(business);
    expect(after).toMatchObject({ planCode: 'INDIVIDUAL', status: 'ACTIVE' });
    expect(Date.parse(after.currentPeriodEndsAt)).toBeGreaterThan(
      Date.now() + 27 * DAY_MS,
    );
    expect((await createClient(business)).status).toBe(201);
  });

  it('la orden de otro negocio no se ve', async () => {
    const business = await billingBusiness();
    const other = await seedBusinessWithCollector(started());
    const { reference } = (await checkout(business)).body as {
      reference: string;
    };

    const response = await started()
      .http.get(`/subscription/checkout/${reference}`)
      .set(HEADERS)
      .set('Cookie', other.ownerCookie);

    expect(response.status).toBe(404);
  });
});
