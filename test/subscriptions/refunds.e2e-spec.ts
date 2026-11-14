import { afterEach, describe, expect, it } from 'vitest';
import { cookieOf, signIn } from '@test/support/auth-flow.js';
import { LEGAL_ACCEPTANCE } from '@test/support/legal-acceptance.js';
import {
  HEADERS,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';
import { BILLING_ENV, wompiEvent } from '@test/support/wompi.js';

const ADMIN_PHONE = '+573009990001';
const ADMIN_PASSWORD = 'contraseña-de-la-plataforma-1';

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

/** Registra la cuenta de quien opera la plataforma (su celular está en `PLATFORM_ADMIN_PHONES`) y devuelve su cookie. */
async function platformAdminCookie(): Promise<string> {
  const registered = await started()
    .http.post('/register')
    .set(HEADERS)
    .send({
      ...LEGAL_ACCEPTANCE,
      phone: ADMIN_PHONE,
      contactEmail: 'plataforma@example.com',
      fullName: 'Quien opera Fiaro',
      password: ADMIN_PASSWORD,
      nationalId: '4999001',
      businessName: 'Fiaro (prueba)',
    });
  expect(registered.status).toBe(201);
  return cookieOf(
    await signIn(started(), { phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  );
}

/** Un negocio que ya pagó el plan PRO (por el aviso firmado de Wompi). */
async function paidBusiness(
  paymentMethod: 'PSE' | 'CARD' = 'PSE',
  env: Record<string, string> = {},
): Promise<{ business: SeededBusiness; reference: string }> {
  app = await startTestApp({
    env: { ...BILLING_ENV, PLATFORM_ADMIN_PHONES: ADMIN_PHONE, ...env },
  });
  const business = await seedBusinessWithCollector(app);
  const created = await app.http
    .post('/subscription/checkout')
    .set(HEADERS)
    .set('Cookie', business.ownerCookie)
    .send({ planCode: 'PRO' });
  const { reference } = created.body as { reference: string };
  const event = wompiEvent(reference);
  event.data.transaction.payment_method_type = paymentMethod;
  await app.http
    .post('/webhooks/wompi')
    .set('X-Event-Checksum', event.signature.checksum)
    .send(event);
  return { business, reference };
}

const refund = (cookie: string, reference: string, body: object) =>
  started()
    .http.post(`/admin/subscription-payments/${reference}/refund`)
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(body);

const periodEnd = async (owner: SeededBusiness) => {
  const response = await started()
    .http.get('/subscription')
    .set(HEADERS)
    .set('Cookie', owner.ownerCookie);
  return Date.parse(response.body.currentPeriodEndsAt as string);
};

describe('reembolsos de los pagos del plan (D-156)', () => {
  it('quien no opera la plataforma no ve ni devuelve pagos: 403', async () => {
    const { business, reference } = await paidBusiness();

    const list = await started()
      .http.get('/admin/subscription-payments')
      .set(HEADERS)
      .set('Cookie', business.ownerCookie);
    const response = await refund(business.ownerCookie, reference, {
      mode: 'MANUAL',
      reason: 'prueba',
    });

    expect(list.status).toBe(403);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('una devolución manual deja el pago REFUNDED y le quita el mes al plan; no se puede devolver dos veces', async () => {
    const { business, reference } = await paidBusiness();
    const admin = await platformAdminCookie();
    const paidUntil = await periodEnd(business);

    const list = await started()
      .http.get('/admin/subscription-payments?status=APPROVED')
      .set(HEADERS)
      .set('Cookie', admin);
    const response = await refund(admin, reference, {
      mode: 'MANUAL',
      reference: 'banco-123',
      reason: 'La dueña pagó dos veces',
    });
    const again = await refund(admin, reference, {
      mode: 'MANUAL',
      reason: 'otra vez',
    });

    const everything = await started()
      .http.get('/admin/subscription-payments')
      .set(HEADERS)
      .set('Cookie', admin);
    expect(everything.body.items).toHaveLength(1);
    expect(list.status).toBe(200);
    expect(list.body.items[0]).toMatchObject({
      reference,
      tenantName: expect.any(String),
      status: 'APPROVED',
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      reference,
      status: 'REFUNDED',
      refundMode: 'MANUAL',
    });
    expect(await periodEnd(business)).toBeLessThan(paidUntil);
    const row = await started().prisma.subscriptionPayment.findUniqueOrThrow({
      where: { reference },
    });
    expect(row).toMatchObject({
      status: 'REFUNDED',
      refundReference: 'banco-123',
      refundReason: 'La dueña pagó dos veces',
    });
    expect(again.status).toBe(422);
    expect(again.body.code).toBe('PAYMENT_NOT_REFUNDABLE');
  });

  it('anular en Wompi solo sirve para pagos con tarjeta: con PSE responde 422 y no cambia nada', async () => {
    const { business, reference } = await paidBusiness('PSE');
    const admin = await platformAdminCookie();
    const paidUntil = await periodEnd(business);

    const response = await refund(admin, reference, {
      mode: 'WOMPI_VOID',
      reason: 'prueba',
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('REFUND_METHOD_UNSUPPORTED');
    expect(await periodEnd(business)).toBe(paidUntil);
  });

  it('una orden que no existe responde 404 y un cuerpo sin motivo, 400', async () => {
    await paidBusiness();
    const admin = await platformAdminCookie();

    expect(
      (await refund(admin, 'fiaro-no-existe', { mode: 'MANUAL', reason: 'x' }))
        .status,
    ).toBe(404);
    expect((await refund(admin, 'fiaro-x', { mode: 'MANUAL' })).status).toBe(
      400,
    );
  });
});
