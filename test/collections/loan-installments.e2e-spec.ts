import { toBusinessDate } from '@fiaro-app/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { nextIp } from '@test/support/auth-flow.js';
import { seedLoan } from '@test/support/seed-loan.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /loans/:loanId/installments', () => {
  it('con el calendario vencido, imputa los pagos de la cuota más antigua a la más nueva', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app, {
      paidAmounts: [10_000, 5_000],
    });

    const response = await app.http
      .get(`/loans/${loanId}/installments`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(200);
    expect(response.body.loanId).toBe(loanId);
    expect(response.body.asOf).toBe(TODAY);
    const rows = response.body.installments as {
      number: number;
      expectedAmount: number;
      paidAmount: number;
      status: string;
    }[];
    expect(rows.map((row) => row.number)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((row) => [row.paidAmount, row.status])).toEqual([
      [10_000, 'PAID'],
      [5_000, 'PARTIAL'],
      [0, 'OVERDUE'],
      [0, 'OVERDUE'],
      [0, 'OVERDUE'],
    ]);
  });

  it('si el calendario todavía no empieza, todas las cuotas son PENDING', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app, {
      startDate: addDays(TODAY, 10),
    });

    const response = await app.http
      .get(`/loans/${loanId}/installments`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(200);
    const statuses = (response.body.installments as { status: string }[]).map(
      (row) => row.status,
    );
    expect(statuses).toEqual(Array(5).fill('PENDING'));
  });

  it('coincide con el saldo: la primera cuota sin cubrir es la de la mora', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app, { paidAmounts: [10_000] });
    const ip = nextIp();

    const installments = await app.http
      .get(`/loans/${loanId}/installments`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', ip);
    const balance = await app.http
      .get(`/loans/${loanId}/balance`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', ip);

    const firstUnpaid = (
      installments.body.installments as { status: string; dueDate: string }[]
    ).find((row) => row.status !== 'PAID');
    expect(firstUnpaid?.dueDate).toBe(balance.body.firstOverdueDate);
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp();
    const { loanId } = await seedLoan(app);

    const response = await app.http.get(`/loans/${loanId}/installments`);

    expect(response.status).toBe(401);
  });

  it('responde 404 para un préstamo de otro prestamista', async () => {
    app = await startTestApp();
    const { loanId } = await seedLoan(app);
    const { cookie: otherCookie } = await seedLoan(app);

    const response = await app.http
      .get(`/loans/${loanId}/installments`)
      .set('Cookie', otherCookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('responde 400 si el id del préstamo no es un UUID', async () => {
    app = await startTestApp();
    const { cookie } = await seedLoan(app);

    const response = await app.http
      .get('/loans/no-es-un-uuid/installments')
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(400);
  });
});
