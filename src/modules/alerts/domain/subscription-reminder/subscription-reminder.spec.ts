import { describe, expect, it } from 'vitest';
import {
  reminderFor,
  reminderMessage,
} from '@/modules/alerts/domain/subscription-reminder/subscription-reminder.js';

/** 08:00 de Bogotá de ese día: la hora a la que sale el envío. */
const at8 = (day: string) => new Date(`${day}T13:00:00Z`);
/** Un vencimiento a cualquier hora de ese día de Bogotá. */
const endsAt = (day: string, hourUtc = 22) =>
  new Date(`${day}T${String(hourUtc)}:30:00Z`);

describe('reminderFor', () => {
  const NOW = at8('2026-10-20');

  it.each([
    ['2026-10-27', 7],
    ['2026-10-23', 3],
    ['2026-10-21', 1],
  ])('avisa que vence en %s (%i días)', (day, days) => {
    expect(reminderFor(endsAt(day), NOW)).toEqual({ kind: 'ENDING', days });
  });

  it('el día del vencimiento avisa que vence hoy, a cualquier hora que caiga', () => {
    expect(reminderFor(endsAt('2026-10-20', 14), NOW)).toEqual({
      kind: 'ENDS_TODAY',
    });
    expect(reminderFor(endsAt('2026-10-20', 22), NOW)).toEqual({
      kind: 'ENDS_TODAY',
    });
  });

  it('un vencimiento de madrugada UTC cuenta como el día anterior en Bogotá', () => {
    expect(reminderFor(new Date('2026-10-21T03:00:00Z'), NOW)).toEqual({
      kind: 'ENDS_TODAY',
    });
  });

  it('cada día de gracia dice cuántos quedan', () => {
    expect(reminderFor(endsAt('2026-10-19'), NOW)).toEqual({
      kind: 'GRACE',
      daysLeft: 6,
    });
    expect(reminderFor(endsAt('2026-10-13'), NOW)).toEqual({
      kind: 'GRACE',
      daysLeft: 0,
    });
  });

  it('el día después de la gracia avisa del solo lectura, una sola vez', () => {
    expect(reminderFor(endsAt('2026-10-12'), NOW)).toEqual({
      kind: 'READ_ONLY',
    });
    expect(reminderFor(endsAt('2026-10-11'), NOW)).toBeNull();
  });

  it.each([
    '2026-10-28',
    '2026-10-26',
    '2026-10-25',
    '2026-10-24',
    '2026-10-22',
  ])('los demás días antes del vencimiento no avisa (%s)', (day) => {
    expect(reminderFor(endsAt(day), NOW)).toBeNull();
  });
});

describe('reminderMessage', () => {
  it('habla de la prueba o del plan según lo que tenga', () => {
    expect(reminderMessage({ kind: 'ENDING', days: 3 }, true)).toMatchObject({
      title: 'Tu prueba gratis termina pronto',
      body: expect.stringContaining('en 3 días') as string,
      severity: 'WARNING',
    });
    expect(reminderMessage({ kind: 'ENDING', days: 1 }, false)).toMatchObject({
      title: 'Tu plan vence pronto',
      body: expect.stringContaining('en 1 día.') as string,
    });
  });

  it('siempre dice dónde renovar', () => {
    for (const reminder of [
      { kind: 'ENDING', days: 7 },
      { kind: 'ENDS_TODAY' },
      { kind: 'GRACE', daysLeft: 2 },
      { kind: 'READ_ONLY' },
    ] as const) {
      expect(reminderMessage(reminder, false).body).toContain('Plan y pagos');
    }
  });

  it('en gracia y en solo lectura la urgencia sube a ALERT', () => {
    expect(reminderMessage({ kind: 'ENDS_TODAY' }, false).severity).toBe(
      'WARNING',
    );
    expect(
      reminderMessage({ kind: 'GRACE', daysLeft: 1 }, false),
    ).toMatchObject({
      severity: 'ALERT',
      body: expect.stringContaining('1 día') as string,
    });
    expect(reminderMessage({ kind: 'READ_ONLY' }, true).severity).toBe('ALERT');
  });
});
