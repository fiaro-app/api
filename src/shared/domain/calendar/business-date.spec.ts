import { describe, expect, it } from 'vitest';
import { addDays } from '@/shared/domain/calendar/business-date.js';

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
