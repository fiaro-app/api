import { describe, expect, it } from 'vitest';
import { expectedByDay } from '@/modules/dashboard/application/services/expected-by-day.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';

const loan = (
  startDate: string,
  installmentValue: number,
  installmentCount = 5,
): LoanDetails =>
  ({
    startDate,
    frequency: 'DAILY',
    installmentCount,
    installmentValue,
  }) as LoanDetails;

const LENDER = { nonWorkingWeekdays: [], skipNationalHolidays: false } as const;

describe('expectedByDay', () => {
  it('suma la cuota de cada préstamo en los días que le toca, solo dentro del rango', () => {
    // La primera cuota vence al día siguiente del arranque: A del 02 al 06, B del 04 al 08.
    const totals = expectedByDay(
      [loan('2026-10-01', 10_000), loan('2026-10-03', 5_000)],
      LENDER,
      '2026-10-03',
      '2026-10-06',
    );

    expect([...totals]).toEqual([
      ['2026-10-03', 10_000],
      ['2026-10-04', 15_000],
      ['2026-10-05', 15_000],
      ['2026-10-06', 15_000],
    ]);
  });

  it('respeta los días sin cobro del prestamista', () => {
    const totals = expectedByDay(
      [loan('2026-10-01', 10_000)],
      {
        nonWorkingWeekdays: ['SATURDAY', 'SUNDAY'],
        skipNationalHolidays: false,
      },
      '2026-10-01',
      '2026-10-12',
    );

    expect(totals.has('2026-10-03')).toBe(false);
    expect(totals.has('2026-10-04')).toBe(false);
  });

  it('sin préstamos no hay nada que cobrar', () => {
    expect(expectedByDay([], LENDER, '2026-10-01', '2026-10-30').size).toBe(0);
  });
});
