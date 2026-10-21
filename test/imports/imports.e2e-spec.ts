import { afterEach, describe, expect, it } from 'vitest';
import {
  HEADERS,
  seedBusinessWithCollector,
  type SeededBusiness,
} from '@test/support/notification-seed.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

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

async function business(planCode = 'PRO'): Promise<SeededBusiness> {
  app = await startTestApp({ env: { CORS_ORIGINS: HEADERS.Origin } });
  const seeded = await seedBusinessWithCollector(app);
  await app.prisma.subscription.updateMany({ data: { planCode } });
  return seeded;
}

function importRows(cookie: string, body: object) {
  return started()
    .http.post('/imports')
    .set(HEADERS)
    .set('Cookie', cookie)
    .send(body);
}

const person = (nationalId: string) => ({
  nationalId,
  fullName: 'María Pérez',
  occupation: 'Tendera',
  phone: '3001234567',
  address: 'Calle 1 # 2-3',
});

const loan = (collectorPhone?: string) => ({
  remainingInstallments: 10,
  installmentValue: 30_000,
  frequency: 'WEEKLY',
  nextInstallmentDate: '2026-11-03',
  ...(collectorPhone === undefined ? {} : { collectorPhone }),
});

describe('POST /imports (D-152)', () => {
  it('Individual no importa: 403 PLAN_FEATURE_UNAVAILABLE', async () => {
    const owner = await business('INDIVIDUAL');

    const response = await importRows(owner.ownerCookie, {
      dryRun: true,
      rows: [person('710000001')],
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('PLAN_FEATURE_UNAVAILABLE');
  });

  it('un cobrador no importa: 403 FORBIDDEN', async () => {
    const owner = await business();

    const response = await importRows(owner.collectorCookie, {
      dryRun: true,
      rows: [person('710000002')],
    });

    expect(response.status).toBe(403);
  });

  it('sin filas, o con filas de más, responde 400', async () => {
    const owner = await business();

    expect(
      (await importRows(owner.ownerCookie, { dryRun: true, rows: [] })).status,
    ).toBe(400);
    expect(
      (
        await importRows(owner.ownerCookie, {
          dryRun: true,
          rows: Array.from({ length: 201 }, (_, i) => person(String(i))),
        })
      ).status,
    ).toBe(400);
  });

  it('la vista previa revisa y cuenta, sin crear nada', async () => {
    const owner = await business();

    const response = await importRows(owner.ownerCookie, {
      dryRun: true,
      rows: [
        { ...person('710000003'), loan: loan(owner.collectorPhone) },
        { ...person('710000003'), loan: loan() },
        { ...person('1'), phone: '123' },
      ],
    });

    expect(response.status).toBe(200);
    expect(response.body.dryRun).toBe(true);
    expect(response.body.summary).toMatchObject({
      rows: 3,
      ok: 2,
      invalid: 1,
      newClients: 1,
      loans: 2,
    });
    expect(response.body.rows[1].client).toBe('EXISTING');
    expect(response.body.rows[2].status).toBe('INVALID');
    expect(response.body.rows[2].issues.length).toBeGreaterThan(0);
    expect(await started().prisma.client.count()).toBe(0);
  });

  it('confirmar crea clientes, préstamos y la asignación; un mismo cliente se reutiliza', async () => {
    const owner = await business();
    const prisma = started().prisma;

    const response = await importRows(owner.ownerCookie, {
      dryRun: false,
      rows: [
        { ...person('710000004'), loan: loan(owner.collectorPhone) },
        { ...person('710000004'), loan: loan() },
        person('710000005'),
      ],
    });

    expect(response.status).toBe(200);
    expect(response.body.summary).toMatchObject({
      ok: 3,
      failed: 0,
      newClients: 2,
      loans: 2,
    });
    expect(await prisma.client.count()).toBe(2);
    expect(await prisma.loan.count()).toBe(2);
    expect(await prisma.collectionAssignment.count()).toBe(1);
    expect(
      await prisma.notification.count({
        where: { title: 'Préstamo asignado' },
      }),
    ).toBe(0);
    const stored = await prisma.loan.findFirstOrThrow({
      orderBy: { createdAt: 'asc' },
    });
    expect(stored.startDate.slice(0, 10)).toBe('2026-10-27');
  });

  it('un cliente que ya existe se reutiliza; un cobrador desconocido deja la fila inválida', async () => {
    const owner = await business();
    await importRows(owner.ownerCookie, {
      dryRun: false,
      rows: [person('710000006')],
    });

    const response = await importRows(owner.ownerCookie, {
      dryRun: false,
      rows: [
        { ...person('710000006'), loan: loan() },
        { ...person('710000007'), loan: loan('3109999999') },
      ],
    });

    expect(response.body.rows[0]).toMatchObject({
      status: 'IMPORTED',
      client: 'EXISTING',
    });
    expect(response.body.rows[1].status).toBe('INVALID');
    expect(response.body.rows[1].issues[0].field).toBe('collectorPhone');
  });

  it('una fila que choca con el tope del plan falla sola, con el mensaje traducido', async () => {
    const owner = await business();
    await started().prisma.subscription.updateMany({
      data: { maxActiveLoans: 1 },
    });

    const response = await importRows(owner.ownerCookie, {
      dryRun: false,
      rows: [
        { ...person('710000008'), loan: loan() },
        { ...person('710000009'), loan: loan() },
      ],
    });

    expect(response.body.rows[0].status).toBe('IMPORTED');
    expect(response.body.rows[1].status).toBe('FAILED');
    expect(response.body.rows[1].issues[0].message).toContain('plan');
  });
});
