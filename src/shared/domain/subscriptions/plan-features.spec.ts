import { describe, expect, it } from 'vitest';
import {
  featuresOf,
  planHasFeature,
  PLAN_FEATURES,
} from '@/shared/domain/subscriptions/plan-features.js';

describe('funciones por plan', () => {
  it('Individual no trae ninguna; Pro, Team y la prueba las traen todas', () => {
    expect(featuresOf('INDIVIDUAL')).toEqual([]);
    for (const plan of ['PRO', 'TEAM', 'TRIAL']) {
      expect(featuresOf(plan)).toEqual(PLAN_FEATURES);
    }
  });

  it('pregunta por una función concreta', () => {
    expect(planHasFeature('PRO', 'ADVANCED_STATS')).toBe(true);
    expect(planHasFeature('INDIVIDUAL', 'EXCEL_IMPORT')).toBe(false);
  });

  it('un plan que el código no conoce no se queda sin funciones', () => {
    expect(featuresOf('ENTERPRISE')).toEqual(PLAN_FEATURES);
  });
});
