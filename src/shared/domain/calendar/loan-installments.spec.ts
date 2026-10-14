import { describe, expect, it } from 'vitest';
import { computeLoanBalance } from '@/shared/domain/calendar/loan-balance.js';
import {
  computeLoanInstallments,
  type LoanInstallmentsInput,
} from '@/shared/domain/calendar/loan-installments.js';

/** Préstamo semanal de 4 cuotas de 10.000 desde el lunes 2026-09-07; sin días sin cobro. */
const BASE: LoanInstallmentsInput = {
  startDate: '2026-09-07',
  frequency: 'WEEKLY',
  installmentCount: 4,
  installmentValue: 10_000,
  nonWorkingWeekdays: [],
  skipNationalHolidays: false,
  totalPaid: 0,
  asOf: '2026-09-22',
  isClosed: false,
};

describe('computeLoanInstallments', () => {
  it('arma una fila por cuota, numeradas desde 1, con las fechas esperadas', () => {
    const rows = computeLoanInstallments(BASE);

    expect(rows.map((row) => [row.number, row.dueDate])).toEqual([
      [1, '2026-09-14'],
      [2, '2026-09-21'],
      [3, '2026-09-28'],
      [4, '2026-10-05'],
    ]);
    expect(rows.every((row) => row.expectedAmount === 10_000)).toBe(true);
  });

  it('sin pagos: las vencidas son OVERDUE y las futuras PENDING', () => {
    const rows = computeLoanInstallments(BASE);

    expect(rows.map((row) => row.status)).toEqual([
      'OVERDUE',
      'OVERDUE',
      'PENDING',
      'PENDING',
    ]);
    expect(rows.every((row) => row.paidAmount === 0)).toBe(true);
  });

  it('imputa los pagos de la cuota más antigua a la más nueva', () => {
    const rows = computeLoanInstallments({ ...BASE, totalPaid: 15_000 });

    expect(rows.map((row) => [row.paidAmount, row.status])).toEqual([
      [10_000, 'PAID'],
      [5_000, 'PARTIAL'],
      [0, 'PENDING'],
      [0, 'PENDING'],
    ]);
  });

  it('un pago adelantado cubre cuotas que aún no vencen', () => {
    const rows = computeLoanInstallments({ ...BASE, totalPaid: 30_000 });

    expect(rows.map((row) => row.status)).toEqual([
      'PAID',
      'PAID',
      'PAID',
      'PENDING',
    ]);
  });

  it('una cuota que vence hoy sin pago ya está OVERDUE, igual que en el saldo', () => {
    const rows = computeLoanInstallments({ ...BASE, asOf: '2026-09-21' });

    expect(rows[1]?.status).toBe('OVERDUE');
  });

  it('lo pagado de más no pasa de la última cuota', () => {
    const rows = computeLoanInstallments({ ...BASE, totalPaid: 99_000 });

    expect(rows.map((row) => row.paidAmount)).toEqual([
      10_000, 10_000, 10_000, 10_000,
    ]);
    expect(rows.every((row) => row.status === 'PAID')).toBe(true);
  });

  it('un préstamo cerrado no marca mora: lo impago queda PENDING', () => {
    const rows = computeLoanInstallments({
      ...BASE,
      totalPaid: 10_000,
      isClosed: true,
    });

    expect(rows.map((row) => row.status)).toEqual([
      'PAID',
      'PENDING',
      'PENDING',
      'PENDING',
    ]);
  });

  it('ignora un total pagado negativo', () => {
    const rows = computeLoanInstallments({ ...BASE, totalPaid: -5_000 });

    expect(rows.every((row) => row.paidAmount === 0)).toBe(true);
  });

  it('coincide con el motor de mora: la primera cuota impaga es la del saldo', () => {
    const input = { ...BASE, totalPaid: 15_000 };
    const rows = computeLoanInstallments(input);
    const balance = computeLoanBalance({ ...input, totalPayable: 40_000 });

    const firstUnpaid = rows.find((row) => row.status !== 'PAID');
    expect(firstUnpaid?.dueDate).toBe(balance.firstOverdueDate);
  });
});
