import { describe, expect, it } from 'vitest';
import { computeExpectedAmountInRange } from '@/shared/domain/calendar/period-expected.js';

const WEEKLY_LOAN = {
  startDate: '2026-09-01',
  frequency: 'WEEKLY' as const,
  installmentCount: 6,
  installmentValue: 50_000,
  nonWorkingWeekdays: [],
  skipNationalHolidays: false,
};

describe('computeExpectedAmountInRange', () => {
  it('suma solo las cuotas cuya fecha cae dentro del rango', () => {
    // Cuotas semanales desde 2026-09-01: 09-08, 09-15, 09-22, 09-29, 10-06, 10-13.
    expect(
      computeExpectedAmountInRange(WEEKLY_LOAN, '2026-09-10', '2026-09-30'),
    ).toBe(150_000); // 09-15, 09-22 y 09-29
  });

  it('da cero si ninguna cuota cae en el rango', () => {
    expect(
      computeExpectedAmountInRange(WEEKLY_LOAN, '2026-01-01', '2026-01-31'),
    ).toBe(0);
  });

  it('incluye los dos extremos del rango', () => {
    expect(
      computeExpectedAmountInRange(WEEKLY_LOAN, '2026-09-08', '2026-09-08'),
    ).toBe(50_000);
  });

  it('con un préstamo diario, cuenta cada día de cobro dentro del rango', () => {
    const daily = {
      startDate: '2026-10-01',
      frequency: 'DAILY' as const,
      installmentCount: 20,
      installmentValue: 10_000,
      nonWorkingWeekdays: ['SUNDAY'] as const,
      skipNationalHolidays: false,
    };
    // Cuotas desde 10-02 (el 10-01 es el arranque, no una cuota), saltando domingos.
    expect(
      computeExpectedAmountInRange(daily, '2026-10-02', '2026-10-08'),
    ).toBe(
      60_000, // 10-02, 03, 05, 06, 07, 08 (10-04 es domingo) = 6 cuotas
    );
  });
});
