import { afterEach, describe, expect, it } from 'vitest';
import { RunSubscriptionRemindersUseCase } from '@/modules/alerts/application/use-cases/run-subscription-reminders.use-case.js';
import { httpQuery } from '@test/support/security-app.js';
import {
  HEADERS,
  seedBusinessWithCollector,
  verifyContactEmail,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';
import { BILLING_ENV, DAY_MS, wompiEvent } from '@test/support/wompi.js';

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

async function business(): Promise<SeededBusiness> {
  app = await startTestApp({ env: BILLING_ENV });
  return await seedBusinessWithCollector(app);
}

/** Crea una orden y la resuelve con el estado dado, como lo haría Wompi. */
async function payOrder(
  owner: SeededBusiness,
  status: 'APPROVED' | 'DECLINED',
  planCode: 'INDIVIDUAL' | 'PRO' = 'PRO',
) {
  const created = await started()
    .http.post('/subscription/checkout')
    .set(HEADERS)
    .set('Cookie', owner.ownerCookie)
    .send({ planCode });
  const { reference } = created.body as { reference: string };
  const amountInCents = planCode === 'PRO' ? 6_900_000 : 4_900_000;
  const event = wompiEvent(reference, { status, amountInCents });
  await started()
    .http.post('/webhooks/wompi')
    .set('X-Event-Checksum', event.signature.checksum)
    .send(event);
  return reference;
}

async function feed(
  owner: SeededBusiness,
): Promise<{ title: string; body: string }[]> {
  const page = await httpQuery(started().http, '/notifications')
    .set(HEADERS)
    .set('Cookie', owner.ownerCookie)
    .send({});
  return (page.body as { data: { title: string; body: string }[] }).data;
}

describe('GET /subscription/payments', () => {
  it('lista las órdenes del negocio, la más reciente primero, con su estado', async () => {
    const owner = await business();
    const first = await payOrder(owner, 'DECLINED', 'INDIVIDUAL');
    const second = await payOrder(owner, 'APPROVED', 'PRO');

    const response = await started()
      .http.get('/subscription/payments')
      .set(HEADERS)
      .set('Cookie', owner.ownerCookie);

    expect(response.status).toBe(200);
    const items = response.body.items as {
      reference: string;
      status: string;
      planCode: string;
      paymentMethodType: string | null;
    }[];
    expect(items.map((item) => item.reference)).toEqual([second, first]);
    expect(items[0]).toMatchObject({
      status: 'APPROVED',
      planCode: 'PRO',
      paymentMethodType: 'PSE',
    });
    expect(items[1]).toMatchObject({
      status: 'DECLINED',
      planCode: 'INDIVIDUAL',
    });
  });

  it('solo la dueña lo ve, y cada negocio ve solo lo suyo', async () => {
    const owner = await business();
    const other = await seedBusinessWithCollector(started());
    await payOrder(owner, 'APPROVED');

    const asCollector = await started()
      .http.get('/subscription/payments')
      .set(HEADERS)
      .set('Cookie', owner.collectorCookie);
    const asOther = await started()
      .http.get('/subscription/payments')
      .set(HEADERS)
      .set('Cookie', other.ownerCookie);

    expect(asCollector.status).toBe(403);
    expect(asOther.body.items).toEqual([]);
  });
});

describe('confirmación del pago', () => {
  it('la dueña recibe el comprobante en el feed y por correo (D-150)', async () => {
    const owner = await business();
    await verifyContactEmail(started(), owner.ownerPhone, 'marta@example.com');

    await payOrder(owner, 'APPROVED');

    const receipt = (await feed(owner)).find(
      (item) => item.title === 'Pago recibido',
    );
    expect(receipt?.body).toMatch(/\$\s?69\.000 del plan Pro/);
    const emails = started().emails.sent.filter(
      (email) => email.to === 'marta@example.com',
    );
    expect(emails.map((email) => email.subject)).toContain(
      'Fiaro: Pago recibido',
    );
  });

  it('un pago rechazado no manda comprobante', async () => {
    const owner = await business();
    await verifyContactEmail(started(), owner.ownerPhone, 'marta@example.com');

    await payOrder(owner, 'DECLINED');

    expect((await feed(owner)).map((item) => item.title)).not.toContain(
      'Pago recibido',
    );
  });
});

describe('recordatorios de vencimiento del plan (D-150)', () => {
  // Cada prueba reclama un día distinto: la base de datos de la corrida es una sola y el día reclamado queda.
  const run = (day: string) =>
    started()
      .app.get(RunSubscriptionRemindersUseCase, { strict: false })
      .execute(day);

  it('le recuerda a la dueña cuando faltan 3 días, una sola vez por día', async () => {
    const owner = await business();
    await started().prisma.subscription.updateMany({
      data: {
        currentPeriodEndsAt: new Date(Date.now() + 3 * DAY_MS + 2 * 3600_000),
      },
    });

    await expect(run('2026-11-03')).resolves.toBe(true);
    await expect(run('2026-11-03')).resolves.toBe(false);

    const reminders = (await feed(owner)).filter(
      (item) => item.title === 'Tu prueba gratis termina pronto',
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.body).toContain('en 3 días');
    const collectorFeed = await httpQuery(started().http, '/notifications')
      .set(HEADERS)
      .set('Cookie', owner.collectorCookie)
      .send({});
    expect((collectorFeed.body as { data: unknown[] }).data).toHaveLength(0);
  });

  it('en gracia avisa cada día y por correo, porque ya es urgente', async () => {
    const owner = await business();
    await verifyContactEmail(started(), owner.ownerPhone, 'marta@example.com');
    await started().prisma.subscription.updateMany({
      data: { currentPeriodEndsAt: new Date(Date.now() - 2 * DAY_MS) },
    });

    await run('2026-10-06');

    expect((await feed(owner)).map((item) => item.title)).toContain(
      'Tu plan está en gracia',
    );
    expect(
      started().emails.sent.some(
        (email) =>
          email.to === 'marta@example.com' &&
          email.subject === 'Fiaro: Tu plan está en gracia',
      ),
    ).toBe(true);
  });

  it('un día sin vencimiento cerca no manda nada', async () => {
    const owner = await business();

    await run('2026-11-05');

    expect((await feed(owner)).map((item) => item.title)).not.toContain(
      'Tu prueba gratis termina pronto',
    );
  });
});
