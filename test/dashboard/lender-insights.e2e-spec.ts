import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { nextIp } from '@test/support/auth-flow.js';
import { seedLoan } from '@test/support/seed-loan.js';
import { httpQuery } from '@test/support/security-app.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());
const WIDE = { dateRange: { from: addDays(TODAY, -60), to: TODAY } };

let app: TestApp | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

const insights = (testApp: TestApp, cookie: string, body: object = WIDE) =>
  httpQuery(testApp.http, '/lenders/me/stats/insights')
    .set('Cookie', cookie)
    .set('X-Forwarded-For', nextIp())
    .send(body);

describe('QUERY /lenders/me/stats/insights', () => {
  it('suma lo cobrado, parte capital e interés, y cuenta lo prestado y las visitas', async () => {
    app = await startTestApp();
    const business = await seedLoan(app, { paidAmounts: [10_000, 10_000] });
    // El préstamo devuelve 60.000 por 50.000 prestados: un sexto de cada pago es interés.
    await app.prisma.loan.update({
      where: { id: business.loanId },
      data: { totalPayable: 60_000 },
    });

    await app.prisma.dailySettlement.create({
      data: {
        id: uuidv7(),
        collectorMembershipId: business.membershipId,
        date: TODAY,
        expectedAmount: 30_000,
        collectedAmount: 20_000,
        collectedCash: 20_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        collectorNote: 'Faltó un cliente',
        submittedAt: new Date(),
      },
    });

    const response = await insights(app, business.cookie);

    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.settlements).toEqual({
      submitted: 1,
      balanced: 0,
      withDifference: 1,
      shortfall: 10_000,
      surplus: 0,
    });
    expect(body.income.collected).toBe(20_000);
    expect(body.income.byMethod).toEqual({
      CASH: 20_000,
      NEQUI: 0,
      TRANSFER: 0,
    });
    expect(body.income.interest).toBe(3_333);
    expect(body.income.principalRecovered).toBe(16_667);
    expect(body.origination).toMatchObject({
      loansCreated: 1,
      amountLent: 50_000,
      averageTicket: 50_000,
      agreedInterest: 10_000,
    });
    expect(body.visits).toMatchObject({ PAID: 2, total: 2, paidRate: 1 });
    expect(body.daily).toHaveLength(61);
    const days = body.daily as { collected: number }[];
    expect(
      days.map((day) => day.collected).reduce((sum, value) => sum + value, 0),
    ).toBe(20_000);
    expect(body.forecast).toHaveLength(7);
  });

  it('nunca mezcla datos de otro prestamista', async () => {
    app = await startTestApp();
    const mine = await seedLoan(app, { paidAmounts: [10_000] });
    await seedLoan(app, { paidAmounts: [99_000, 99_000] });

    const response = await insights(app, mine.cookie);

    expect(response.body.income.collected).toBe(10_000);
    expect(response.body.visits.total).toBe(1);
    expect(response.body.origination.loansCreated).toBe(1);
  });

  it('un pago reversado no cuenta', async () => {
    app = await startTestApp();
    const business = await seedLoan(app, { paidAmounts: [10_000, 5_000] });
    const payment = await app.prisma.payment.findFirstOrThrow({
      where: { loanId: business.loanId, amount: 5_000 },
    });
    await app.prisma.paymentReversal.create({
      data: {
        id: uuidv7(),
        paymentId: payment.id,
        reason: 'error',
        reversedByMembershipId: business.membershipId,
      },
    });

    const response = await insights(app, business.cookie);

    expect(response.body.income.collected).toBe(10_000);
  });

  it('rechaza un período al revés (400), sin sesión da 401 y la caché no pasa datos entre períodos', async () => {
    app = await startTestApp();
    const business = await seedLoan(app, { paidAmounts: [10_000] });

    const reversed = await insights(app, business.cookie, {
      dateRange: { from: TODAY, to: addDays(TODAY, -3) },
    });
    const anonymous = await httpQuery(app.http, '/lenders/me/stats/insights')
      .set('X-Forwarded-For', nextIp())
      .send({});
    const empty = await insights(app, business.cookie, {
      dateRange: { from: addDays(TODAY, -3), to: TODAY },
    });

    expect(reversed.status).toBe(400);
    expect(anonymous.status).toBe(401);
    expect(empty.body.income.collected).toBe(0);
  });
});
