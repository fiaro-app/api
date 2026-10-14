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

describe('GET /loans/:loanId/balance', () => {
  it('con el calendario ya vencido, el saldo sale de sumar los pagos reales', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app, {
      paidAmounts: [10_000, 10_000],
    });

    const response = await app.http
      .get(`/loans/${loanId}/balance`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      loanId,
      balance: 30_000, // 50.000 pactados - 20.000 pagados (2 visitas de 10.000)
      totalExpectedToDate: 50_000, // las 5 cuotas ya vencieron (startDate 30 días atrás)
      overdueAmount: 30_000, // solo 2 de las 5 cuotas están pagadas
    });
    expect(response.body.firstOverdueDate).not.toBeNull();
  });

  it('sin ningún pago, el saldo es el total pactado', async () => {
    app = await startTestApp();
    const { loanId, cookie } = await seedLoan(app);

    const response = await app.http
      .get(`/loans/${loanId}/balance`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(200);
    expect(response.body.balance).toBe(50_000);
    expect(response.body.firstOverdueDate).not.toBeNull();
  });

  it('si el calendario todavía no empieza, no hay mora y la próxima fecha es futura', async () => {
    app = await startTestApp();
    const futureStart = addDays(TODAY, 10);
    const { loanId, cookie } = await seedLoan(app, { startDate: futureStart });

    const response = await app.http
      .get(`/loans/${loanId}/balance`)
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      balance: 50_000,
      totalExpectedToDate: 0,
      overdueAmount: 0,
      overdueDays: 0,
      firstOverdueDate: null,
    });
    expect(response.body.nextDueDate > TODAY).toBe(true);
  });

  it('responde 401 sin sesión', async () => {
    app = await startTestApp();
    const { loanId } = await seedLoan(app);

    const response = await app.http.get(`/loans/${loanId}/balance`);

    expect(response.status).toBe(401);
  });

  it('responde 404 para un préstamo de otro prestamista', async () => {
    app = await startTestApp();
    const { loanId } = await seedLoan(app);
    const { cookie: otherCookie } = await seedLoan(app);

    const response = await app.http
      .get(`/loans/${loanId}/balance`)
      .set('Cookie', otherCookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('responde 400 si el id del préstamo no es un UUID', async () => {
    app = await startTestApp();
    const { cookie } = await seedLoan(app);

    const response = await app.http
      .get('/loans/no-es-un-uuid/balance')
      .set('Cookie', cookie)
      .set('X-Forwarded-For', nextIp());

    expect(response.status).toBe(400);
  });
});
