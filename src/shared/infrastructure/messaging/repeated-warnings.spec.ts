import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REPEATED_WARNING_INTERVAL_MS,
  repeatedWarnings,
  type Warn,
} from '@/shared/infrastructure/messaging/repeated-warnings.js';

describe('repeatedWarnings', () => {
  let clock: number;
  let written: string[];
  let warn: Warn;

  beforeEach(() => {
    clock = 1_000_000;
    written = [];
    warn = repeatedWarnings(
      { warn: (message) => written.push(message) },
      { intervalMs: 60_000, now: () => clock },
    );
  });

  it('escribe el primer aviso tal cual', () => {
    warn('Redis caído');

    expect(written).toEqual(['Redis caído']);
  });

  it('calla el mismo texto mientras no pase el intervalo', () => {
    warn('Redis caído');
    clock += 59_999;
    warn('Redis caído');
    warn('Redis caído');

    expect(written).toEqual(['Redis caído']);
  });

  it('lo escribe otra vez pasado el intervalo y dice cuántas veces se calló', () => {
    warn('Redis caído');
    clock += 10_000;
    warn('Redis caído');
    clock += 10_000;
    warn('Redis caído');
    clock += 40_000;
    warn('Redis caído');

    expect(written).toEqual([
      'Redis caído',
      'Redis caído (se repitió 2 veces)',
    ]);
  });

  it('no arrastra la cuenta de una escritura a la siguiente', () => {
    warn('Redis caído');
    clock += 1_000;
    warn('Redis caído');
    clock += 60_000;
    warn('Redis caído');
    clock += 60_000;
    warn('Redis caído');

    expect(written).toEqual([
      'Redis caído',
      'Redis caído (se repitió una vez)',
      'Redis caído',
    ]);
  });

  it('un texto distinto sale de inmediato, aunque otro esté callado', () => {
    warn('Redis caído');
    warn('MongoDB caído');
    warn('Redis caído');

    expect(written).toEqual(['Redis caído', 'MongoDB caído']);
  });

  it('con demasiados textos distintos olvida los anteriores en lugar de crecer sin límite', () => {
    warn('primero');
    for (let i = 0; i < 100; i += 1) {
      warn(`distinto ${String(i)}`);
    }
    warn('primero');

    expect(written.filter((message) => message === 'primero')).toHaveLength(2);
  });

  it('usa Date.now y un minuto si no se le da otro reloj ni intervalo', () => {
    vi.useFakeTimers();
    const sink: string[] = [];
    const real = repeatedWarnings({ warn: (message) => sink.push(message) });

    real('caído');
    vi.advanceTimersByTime(REPEATED_WARNING_INTERVAL_MS - 1);
    real('caído');
    vi.advanceTimersByTime(1);
    real('caído');
    vi.useRealTimers();

    expect(sink).toEqual(['caído', 'caído (se repitió una vez)']);
  });
});
