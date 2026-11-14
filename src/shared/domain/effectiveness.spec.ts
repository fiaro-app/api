import { describe, expect, it } from 'vitest';
import { effectivenessOf } from '@/shared/domain/effectiveness.js';

describe('effectivenessOf', () => {
  it('es lo cobrado entre lo esperado', () => {
    expect(effectivenessOf(900_000, 1_000_000)).toBe(0.9);
    expect(effectivenessOf(0, 1_000_000)).toBe(0);
  });

  it('no pasa de 100 % aunque se cobre de más (atrasos o adelantos)', () => {
    expect(effectivenessOf(1_500_000, 1_000_000)).toBe(1);
  });

  it('no baja de 0 % aunque lo cobrado salga negativo', () => {
    expect(effectivenessOf(-10_000, 1_000_000)).toBe(0);
  });

  it('es null cuando no había nada esperado', () => {
    expect(effectivenessOf(50_000, 0)).toBeNull();
  });
});
