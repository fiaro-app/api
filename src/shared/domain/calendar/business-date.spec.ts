import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
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
