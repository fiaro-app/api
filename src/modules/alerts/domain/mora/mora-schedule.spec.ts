import { describe, expect, it } from 'vitest';
import {
  moraRunMomentOn,
  nextMoraRunMoment,
} from '@/modules/alerts/domain/mora/mora-schedule.js';

describe('moraRunMomentOn', () => {
  it('son las 13:00 UTC del mismo día, que son las 08:00 en Bogotá', () => {
    expect(
      moraRunMomentOn(new Date('2026-10-06T00:00:00.000Z')).toISOString(),
    ).toBe('2026-10-06T13:00:00.000Z');
    expect(
      moraRunMomentOn(new Date('2026-10-06T23:59:59.000Z')).toISOString(),
    ).toBe('2026-10-06T13:00:00.000Z');
  });
});

describe('nextMoraRunMoment', () => {
  it('es el mismo momento 24 horas después, porque UTC no tiene horario de verano', () => {
    expect(
      nextMoraRunMoment(new Date('2026-10-06T13:00:00.000Z')).toISOString(),
    ).toBe('2026-10-07T13:00:00.000Z');
  });
});
