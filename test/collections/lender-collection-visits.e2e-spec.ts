import { toBusinessDate } from '@fiaro-app/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { seedBusinessWithCollector } from '@test/support/notification-seed.js';
import { seedLoan } from '@test/support/seed-loan.js';
import { httpQuery } from '@test/support/security-app.js';
import { nextIp } from '@test/support/auth-flow.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

interface Row {
  visitId: string;
  outcome: string;
  client: { fullName: string };
  collector: { membershipId: string; fullName: string };
  payment: { amount: number; method: string; reversed: boolean } | null;
}

/** Un préstamo cuyas visitas ocurrieron hoy (a las 10:00 de Bogotá), una por cada pago. */
function seedToday(testApp: TestApp, paidAmounts: readonly number[]) {
  return seedLoan(testApp, { startDate: addDays(TODAY, -1), paidAmounts });
}

function search(testApp: TestApp, cookie: string, body: object) {
  return httpQuery(testApp.http, '/collection-visits')
    .set('Cookie', cookie)
    .set('X-Forwarded-For', nextIp())
    .send(body);
}

describe('QUERY /collection-visits', () => {
  it('sin rango devuelve las visitas de hoy con préstamo, cliente, cobrador y pago', async () => {
    app = await startTestApp();
    const { cookie, loanId, membershipId } = await seedToday(
      app,
      [10_000, 5_000],
    );

    const response = await search(app, cookie, {});

    expect(response.status).toBe(200);
    expect(response.body.range).toEqual({ from: TODAY, to: TODAY });
    expect(response.body.meta).toEqual({ page: 1, pageSize: 20, total: 2 });
    const rows = response.body.data as (Row & { loan: { id: string } })[];
    const amounts = rows.map((row) => row.payment?.amount ?? 0);
    expect(amounts.toSorted((a, b) => a - b)).toEqual([5_000, 10_000]);
    expect(rows[0]).toMatchObject({
      outcome: 'PAID',
      loan: { id: loanId },
      client: { fullName: 'Carlos Ramírez' },
      collector: { membershipId, fullName: 'Ana Pérez' },
      payment: { method: 'CASH', reversed: false },
    });
  });

  it('no incluye las visitas de otro prestamista', async () => {
    app = await startTestApp();
    const { cookie } = await seedToday(app, [10_000]);
    await seedToday(app, [20_000, 30_000]);

    const response = await search(app, cookie, {});

    expect(response.body.meta.total).toBe(1);
  });

  it('el rango deja fuera lo que no cae en él', async () => {
    app = await startTestApp();
    const { cookie } = await seedToday(app, [10_000]);

    const past = await search(app, cookie, {
      dateRange: { from: addDays(TODAY, -10), to: addDays(TODAY, -5) },
    });
    const wide = await search(app, cookie, {
      dateRange: { from: addDays(TODAY, -10), to: TODAY },
    });

    expect(past.body.meta.total).toBe(0);
    expect(wide.body.meta.total).toBe(1);
  });

  it('filtra por cobrador, por resultado y por cartera', async () => {
    app = await startTestApp();
    const { cookie, membershipId, lenderId } = await seedToday(app, [10_000]);
    const portfolio = await app.prisma.portfolio.findFirstOrThrow({
      where: { lenderId },
    });

    const byCollector = await search(app, cookie, {
      collectorMembershipId: membershipId,
    });
    const otherCollector = await search(app, cookie, {
      collectorMembershipId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
    });
    const refused = await search(app, cookie, { outcome: 'REFUSED' });
    const byPortfolio = await search(app, cookie, {
      portfolioId: portfolio.id,
    });
    const otherPortfolio = await search(app, cookie, {
      portfolioId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
    });

    expect(byCollector.body.meta.total).toBe(1);
    expect(otherCollector.body.meta.total).toBe(0);
    expect(refused.body.meta.total).toBe(0);
    expect(byPortfolio.body.meta.total).toBe(1);
    expect(otherPortfolio.body.meta.total).toBe(0);
  });

  it('pagina: total completo y solo pageSize filas por página', async () => {
    app = await startTestApp();
    const { cookie } = await seedToday(app, [1_000, 2_000, 3_000]);

    const first = await search(app, cookie, { page: 1, pageSize: 2 });
    const second = await search(app, cookie, { page: 2, pageSize: 2 });

    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
    expect(first.body.data).toHaveLength(2);
    expect(second.body.data).toHaveLength(1);
  });

  it('marca como reversado un pago anulado', async () => {
    app = await startTestApp();
    const { cookie, loanId, membershipId } = await seedToday(app, [10_000]);
    const payment = await app.prisma.payment.findFirstOrThrow({
      where: { loanId },
    });
    await app.prisma.paymentReversal.create({
      data: {
        id: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
        paymentId: payment.id,
        reason: 'Monto equivocado.',
        reversedByMembershipId: membershipId,
      },
    });

    const response = await search(app, cookie, {});

    expect((response.body.data as Row[])[0]?.payment?.reversed).toBe(true);
  });

  it('responde 403 a un cobrador que no administra el negocio', async () => {
    app = await startTestApp({
      env: { CORS_ORIGINS: 'http://localhost:3040' },
    });
    const { collectorCookie } = await seedBusinessWithCollector(app);

    const response = await search(app, collectorCookie, {}).set(
      'Origin',
      'http://localhost:3040',
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('responde 400 con un filtro inválido', async () => {
    app = await startTestApp();
    const { cookie } = await seedToday(app, []);

    const response = await search(app, cookie, { outcome: 'LATE' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp();

    const response = await httpQuery(app.http, '/collection-visits').send({});

    expect(response.status).toBe(401);
  });
});
