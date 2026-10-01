import { describe, expect, it } from 'vitest';
import { computeExpectedInstallmentDates } from '@/shared/domain/calendar/loan-schedule.js';

describe('computeExpectedInstallmentDates', () => {
  it('DAILY: una fecha por cada día de cobro, saltando el domingo', () => {
    expect(
      computeExpectedInstallmentDates({
        startDate: '2026-09-24', // jueves
        frequency: 'DAILY',
        installmentCount: 4,
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      }),
    ).toEqual(['2026-09-25', '2026-09-26', '2026-09-28', '2026-09-29']);
  });

  it('WEEKLY: cada 7 días naturales, corrido al siguiente día de cobro si cae en domingo', () => {
    expect(
      computeExpectedInstallmentDates({
        startDate: '2026-09-20', // domingo
        frequency: 'WEEKLY',
        installmentCount: 2,
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      }),
    ).toEqual(['2026-09-28', '2026-10-05']);
  });

  it('BIWEEKLY: cada 15 días naturales', () => {
    expect(
      computeExpectedInstallmentDates({
        startDate: '2026-09-24', // jueves
        frequency: 'BIWEEKLY',
        installmentCount: 2,
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      }),
    ).toEqual(['2026-10-09', '2026-10-24']);
  });

  it('MONTHLY: el mismo día del mes, recortado al último día si el mes es más corto', () => {
    expect(
      computeExpectedInstallmentDates({
        startDate: '2026-01-31',
        frequency: 'MONTHLY',
        installmentCount: 3,
        nonWorkingWeekdays: [],
        skipNationalHolidays: false,
      }),
    ).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('salta los festivos nacionales cuando el prestamista los configura', () => {
    expect(
      computeExpectedInstallmentDates({
        startDate: '2026-10-25', // domingo
        frequency: 'WEEKLY',
        installmentCount: 1,
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: true,
      }),
    ).toEqual(['2026-11-03']); // +7 = 1 nov (domingo) -> 2 nov (festivo) -> 3 nov
  });

  it('da exactamente installmentCount fechas, ordenadas', () => {
    const dates = computeExpectedInstallmentDates({
      startDate: '2026-09-24',
      frequency: 'DAILY',
      installmentCount: 10,
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
    });
    expect(dates).toHaveLength(10);
    expect(dates).toEqual([...dates].sort());
  });

  it('propaga el error si el prestamista no tiene ningún día de cobro', () => {
    expect(() =>
      computeExpectedInstallmentDates({
        startDate: '2026-09-24',
        frequency: 'MONTHLY',
        installmentCount: 1,
        nonWorkingWeekdays: [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
          'SUNDAY',
        ],
        skipNationalHolidays: false,
      }),
    ).toThrow(RangeError);
  });
});
