import { describe, expect, it } from 'vitest';
import {
  isWorkingDay,
  nextWorkingDayOnOrAfter,
  weekdayOf,
} from '@/shared/domain/calendar/working-day.js';

describe('weekdayOf', () => {
  it('lanza si la fecha no es válida (getUTCDay() da NaN, fuera del arreglo)', () => {
    expect(() => weekdayOf('no-es-una-fecha')).toThrow(RangeError);
  });

  it.each([
    ['2026-09-27', 'SUNDAY'],
    ['2026-09-28', 'MONDAY'],
    ['2026-09-29', 'TUESDAY'],
    ['2026-09-30', 'WEDNESDAY'],
    ['2026-10-01', 'THURSDAY'],
    ['2026-10-02', 'FRIDAY'],
    ['2026-10-03', 'SATURDAY'],
  ])('%s es %s', (isoDate, expected) => {
    expect(weekdayOf(isoDate)).toBe(expected);
  });
});

describe('isWorkingDay', () => {
  it('es día de cobro si no es un día de la semana sin cobro ni festivo', () => {
    expect(
      isWorkingDay('2026-09-28', {
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: true,
      }),
    ).toBe(true);
  });

  it('no es día de cobro si cae en un día de la semana configurado como sin cobro', () => {
    expect(
      isWorkingDay('2026-09-27', {
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      }),
    ).toBe(false);
  });

  it('no es día de cobro si es festivo nacional y el prestamista los salta', () => {
    expect(
      isWorkingDay('2026-01-01', {
        nonWorkingWeekdays: [],
        skipNationalHolidays: true,
      }),
    ).toBe(false);
  });

  it('es día de cobro un festivo si el prestamista no los salta', () => {
    expect(
      isWorkingDay('2026-01-01', {
        nonWorkingWeekdays: [],
        skipNationalHolidays: false,
      }),
    ).toBe(true);
  });
});

describe('nextWorkingDayOnOrAfter', () => {
  it('da la misma fecha si ya es día de cobro', () => {
    expect(
      nextWorkingDayOnOrAfter('2026-09-28', {
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      }),
    ).toBe('2026-09-28');
  });

  it('pasa al siguiente día de cobro si cae en domingo', () => {
    expect(
      nextWorkingDayOnOrAfter('2026-09-27', {
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: false,
      }),
    ).toBe('2026-09-28');
  });

  it('salta varios días sin cobro seguidos (festivo justo después de domingo)', () => {
    // 2026-01-01 es jueves (no aplica), se arma un caso real: 2027-01-01 es viernes.
    // Usamos un domingo seguido de lunes festivo: 2026-11-01 es domingo, 2026-11-02 es festivo
    // (Todos los Santos corrido al lunes).
    expect(
      nextWorkingDayOnOrAfter('2026-11-01', {
        nonWorkingWeekdays: ['SUNDAY'],
        skipNationalHolidays: true,
      }),
    ).toBe('2026-11-03');
  });

  it('lanza si el prestamista no tiene ningún día de cobro', () => {
    expect(() =>
      nextWorkingDayOnOrAfter('2026-09-28', {
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
