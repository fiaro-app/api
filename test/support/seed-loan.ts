import { toBusinessDate } from '@fiaro-app/contracts';
import { v7 as uuidv7 } from 'uuid';
import { expect } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';
import { cookieOf, signIn } from '@test/support/auth-flow.js';
import type { TestApp } from '@test/support/test-app.js';

const TODAY = toBusinessDate(new Date());

let seedSeq = 0;

/** Un celular y una cédula distintos en cada llamada, para que las cuentas nunca choquen. */
function nextIdentity(): { phone: string; nationalId: string } {
  seedSeq += 1;
  const suffix = String(seedSeq).padStart(5, '0');
  return { phone: `+5730010${suffix}`, nationalId: `1${suffix}` };
}

/** Opciones de {@link seedLoan}. */
export interface SeedLoanOptions {
  /** Fecha de arranque; por defecto, bien en el pasado (30 días), para que las 5 cuotas ya estén vencidas. */
  readonly startDate?: string;
  /** Un pago (con su visita) por cada monto, en orden. */
  readonly paidAmounts?: readonly number[];
}

/** Lo que {@link seedLoan} deja creado, para que cada prueba lo consulte. */
export interface SeededLoan {
  readonly loanId: string;
  readonly lenderId: string;
  readonly clientId: string;
  readonly membershipId: string;
  /** Cookie de sesión de la persona dueña del negocio (roles `OWNER`, `LENDER` y `COLLECTOR`). */
  readonly cookie: string;
}

/**
 * Deja un negocio completo (Tenant, Lender, cartera, membresía) y un préstamo DAILY de 5 cuotas
 * de 10.000, sin días sin cobro (para que el cálculo no dependa de en qué día de la semana corra
 * la prueba). El cálculo exacto del calendario (festivos, domingo, frecuencias) ya lo prueba
 * `shared/domain/calendar/*.spec.ts` sin tocar la base de datos; esta prueba solo verifica que la
 * ruta real suma los pagos reales y resuelve el prestamista correcto.
 *
 * @param testApp - La aplicación de pruebas en marcha.
 * @param options - Ver {@link SeedLoanOptions}.
 */
export async function seedLoan(
  testApp: TestApp,
  { startDate = addDays(TODAY, -30), paidAmounts = [] }: SeedLoanOptions = {},
): Promise<SeededLoan> {
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
  return {
    loanId,
    lenderId,
    clientId,
    membershipId,
    cookie: cookieOf(response),
  };
}
