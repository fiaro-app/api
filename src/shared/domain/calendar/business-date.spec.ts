import { describe, expect, it } from 'vitest';
import {
  addDays,
  businessDayInstants,
  businessRangeInstants,
  daysBetween,
  startOfBusinessMonth,
} from '@/shared/domain/calendar/business-date.js';

describe('addDays', () => {
  it('suma días dentro del mismo mes', () => {
    expect(addDays('2026-09-10', 5)).toBe('2026-09-15');
  });

  it('resta días con un número negativo', () => {
    expect(addDays('2026-09-10', -1)).toBe('2026-09-09');
  });

  it('cruza el fin de mes', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('cruza el fin de año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('respeta un año bisiesto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('daysBetween', () => {
  it('da 0 entre la misma fecha', () => {
    expect(daysBetween('2026-09-10', '2026-09-10')).toBe(0);
  });

  it('da positivo cuando la segunda fecha es posterior', () => {
    expect(daysBetween('2026-09-10', '2026-09-15')).toBe(5);
  });

  it('da negativo cuando la segunda fecha es anterior', () => {
    expect(daysBetween('2026-09-15', '2026-09-10')).toBe(-5);
  });

  it('cruza el fin de mes y de año', () => {
    expect(daysBetween('2026-12-20', '2027-01-05')).toBe(16);
  });
});

describe('startOfBusinessMonth', () => {
  it('da el primer día del mes de la fecha', () => {
    expect(startOfBusinessMonth('2026-10-15')).toBe('2026-10-01');
  });

  it('funciona ya en el primer día', () => {
    expect(startOfBusinessMonth('2026-10-01')).toBe('2026-10-01');
  });
});

describe('businessDayInstants', () => {
  it('empieza a las 00:00 de Bogotá (05:00 UTC)', () => {
    expect(businessDayInstants('2026-10-07').start.toISOString()).toBe(
      '2026-10-07T05:00:00.000Z',
    );
  });

  it('termina al empezar el día siguiente', () => {
    expect(businessDayInstants('2026-10-07').end.toISOString()).toBe(
      '2026-10-08T05:00:00.000Z',
    );
  });
});

describe('businessRangeInstants', () => {
  it('empieza con el primer día del rango y termina con el día siguiente al último', () => {
    const range = businessRangeInstants('2026-10-01', '2026-10-07');
    expect(range.start.toISOString()).toBe('2026-10-01T05:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-10-08T05:00:00.000Z');
  });

  it('con un solo día, es igual a businessDayInstants', () => {
    const range = businessRangeInstants('2026-10-07', '2026-10-07');
    const day = businessDayInstants('2026-10-07');
    expect(range).toEqual(day);
  });
});
