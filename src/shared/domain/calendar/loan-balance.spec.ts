import { describe, expect, it } from 'vitest';
import {
  computeLoanBalance,
  type LoanBalanceInput,
} from '@/shared/domain/calendar/loan-balance.js';

/**
 * Préstamo DAILY de 5 cuotas de 10000 (total 50000) desde el jueves 2026-09-24, con domingo sin
 * cobro: sus fechas esperadas son 25, 26, 28, 29 y 30 de septiembre de 2026 (D-35: el 27, domingo,
 * pasa al 28).
 */
const BASE: LoanBalanceInput = {
  startDate: '2026-09-24',
  frequency: 'DAILY',
  installmentCount: 5,
  installmentValue: 10_000,
  totalPayable: 50_000,
  nonWorkingWeekdays: ['SUNDAY'],
  skipNationalHolidays: false,
  totalPaid: 0,
  asOf: '2026-09-24',
  isClosed: false,
};

describe('computeLoanBalance', () => {
  it('un préstamo cerrado no tiene mora ni cuotas por venir, sin importar la fecha o los pagos', () => {
    expect(
      computeLoanBalance({
        ...BASE,
        isClosed: true,
        totalPaid: 30_000,
        // Configuración sin ningún día de cobro: si no cerrara primero, lanzaría RangeError.
        nonWorkingWeekdays: [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
          'SUNDAY',
        ],
      }),
    ).toEqual({
      balance: 20_000,
      totalExpectedToDate: 0,
      overdueAmount: 0,
      overdueDays: 0,
      nextDueDate: null,
      firstOverdueDate: null,
    });
  });

  it('antes de la primera cuota, sin mora y con la primera fecha como próxima', () => {
    const result = computeLoanBalance({
      ...BASE,
      asOf: '2026-09-24',
      totalPaid: 0,
    });
    expect(result.totalExpectedToDate).toBe(0);
    expect(result.overdueAmount).toBe(0);
    expect(result.overdueDays).toBe(0);
    expect(result.firstOverdueDate).toBeNull();
    expect(result.nextDueDate).toBe('2026-09-25');
    expect(result.balance).toBe(50_000);
  });

  it('al día: lo pagado cubre lo esperado hasta hoy, sin mora', () => {
    const result = computeLoanBalance({
      ...BASE,
      asOf: '2026-09-27',
      totalPaid: 20_000,
    });
    expect(result.totalExpectedToDate).toBe(20_000);
    expect(result.overdueAmount).toBe(0);
    expect(result.overdueDays).toBe(0);
    expect(result.firstOverdueDate).toBeNull();
    expect(result.nextDueDate).toBe('2026-09-28');
    expect(result.balance).toBe(30_000);
  });

  it('con mora: la cuota impaga más antigua marca los días de atraso', () => {
    const result = computeLoanBalance({
      ...BASE,
      asOf: '2026-09-27',
      totalPaid: 10_000,
    });
    expect(result.totalExpectedToDate).toBe(20_000);
    expect(result.overdueAmount).toBe(10_000);
    expect(result.firstOverdueDate).toBe('2026-09-26');
    expect(result.overdueDays).toBe(1);
    expect(result.nextDueDate).toBe('2026-09-26');
  });

  it('sin ningún pago, la mora empieza en la primera cuota vencida', () => {
    const result = computeLoanBalance({
      ...BASE,
      asOf: '2026-09-27',
      totalPaid: 0,
    });
    expect(result.overdueAmount).toBe(20_000);
    expect(result.firstOverdueDate).toBe('2026-09-25');
    expect(result.overdueDays).toBe(2);
  });

  it('un pago de más no deja el saldo en negativo', () => {
    const result = computeLoanBalance({
      ...BASE,
      asOf: '2026-09-24',
      totalPaid: 999_999,
    });
    expect(result.balance).toBe(0);
  });

  it('lanza si lo pagado es negativo (estado de pagos inconsistente)', () => {
    expect(() =>
      computeLoanBalance({ ...BASE, asOf: '2026-09-27', totalPaid: -1 }),
    ).toThrow(RangeError);
  });

  it('ya pagado del todo y sin cuotas futuras, sin mora y sin próxima fecha', () => {
    const result = computeLoanBalance({
      ...BASE,
      asOf: '2026-10-15',
      totalPaid: 50_000,
    });
    expect(result.totalExpectedToDate).toBe(50_000);
    expect(result.overdueAmount).toBe(0);
    expect(result.nextDueDate).toBeNull();
    expect(result.balance).toBe(0);
  });
});
