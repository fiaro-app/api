import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { afterEach, describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { cookieOf, nextIp, signIn } from '@test/support/auth-flow.js';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

let app: TestApp | undefined;
let seedSeq = 0;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
function nextIdentity(): { phone: string; nationalId: string } {
  seedSeq += 1;
  const suffix = String(seedSeq).padStart(5, '0');
  return { phone: `+5730010${suffix}`, nationalId: `1${suffix}` };
}

/**
 * Deja un negocio completo (Tenant, Lender, cartera, membresía) y un préstamo DAILY de 5 cuotas
 * de 10.000, sin días sin cobro (para que el cálculo no dependa de en qué día de la semana corra
 * la prueba). El cálculo exacto del calendario (festivos, domingo, frecuencias) ya lo prueba
 * `shared/domain/calendar/*.spec.ts` sin tocar la base de datos; esta prueba solo verifica que la
 * ruta real suma los pagos reales y resuelve el prestamista correcto.
 *
 * @param startDate - Fecha de arranque; por defecto, bien en el pasado, para que las 5 cuotas ya
 * estén vencidas sin importar qué día real corra la prueba.
 * @param paidAmounts - Un pago (con su visita) por cada monto, en orden.
 */
interface SeedLoanOptions {
  readonly startDate?: string;
  readonly paidAmounts?: readonly number[];
}

async function seedLoan(
  testApp: TestApp,
  { startDate = addDays(TODAY, -30), paidAmounts = [] }: SeedLoanOptions = {},
): Promise<{ loanId: string; cookie: string }> {
  const { phone, nationalId } = nextIdentity();
  const user = await testApp.createUser({
    phone,
    fullName: 'Ana Pérez',
    password: 'contraseña-de-prueba-1',
  });

  const tenantId = uuidv7();
  const lenderId = uuidv7();
  const portfolioId = uuidv7();
  const clientId = uuidv7();
  const loanId = uuidv7();
  const membershipId = uuidv7();

  await testApp.prisma.tenant.create({
    data: { id: tenantId, name: 'Negocio de prueba' },
  });
  await testApp.prisma.lender.create({
    data: {
      id: lenderId,
      tenantId,
      name: 'Negocio de prueba',
      nonWorkingWeekdays: [],
      skipNationalHolidays: false,
    },
  });
  await testApp.prisma.portfolio.create({
    data: { id: portfolioId, lenderId, name: 'General', isDefault: true },
  });
  await testApp.prisma.membership.create({
    data: {
      id: membershipId,
      userId: user.id,
      lenderId,
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      portfolioId,
    },
  });
  await testApp.prisma.client.create({
    data: {
      id: clientId,
      lenderId,
      nationalId,
      fullName: 'Carlos Ramírez',
      occupation: 'Comerciante',
      phone: '+573001112233',
      address: 'Calle falsa 123',
    },
  });
  await testApp.prisma.loan.create({
    data: {
      id: loanId,
      lenderId,
      clientId,
      principalAmount: 50_000,
      installmentCount: 5,
      installmentValue: 10_000,
      totalPayable: 50_000,
      frequency: 'DAILY',
      startDate,
      createdByMembershipId: membershipId,
    },
  });

  const occurredAt = new Date(`${addDays(startDate, 1)}T15:00:00Z`);
  for (const amount of paidAmounts) {
    const visitId = uuidv7();
    await testApp.prisma.collectionVisit.create({
      data: {
        id: visitId,
        loanId,
        collectorMembershipId: membershipId,
        outcome: 'PAID',
        expectedAmount: 10_000,
        occurredAt,
      },
    });
    await testApp.prisma.payment.create({
      data: {
        id: uuidv7(),
        loanId,
        visitId,
        amount,
        method: 'CASH',
        occurredAt,
      },
    });
  }

  const response = await signIn(testApp, {
    phone,
    password: 'contraseña-de-prueba-1',
  });
  expect(response.status).toBe(200);
  return { loanId, cookie: cookieOf(response) };
}

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
