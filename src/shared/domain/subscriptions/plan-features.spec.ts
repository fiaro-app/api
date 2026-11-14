import { describe, expect, it } from 'vitest';
import {
  featuresOf,
  planHasFeature,
  PLAN_FEATURES,
} from '@/shared/domain/subscriptions/plan-features.js';

describe('funciones por plan', () => {
  it('Individual no trae ninguna; Team y la prueba las traen todas; Pro, las de un solo negocio', () => {
    expect(featuresOf('INDIVIDUAL')).toEqual([]);
    for (const plan of ['TEAM', 'TRIAL']) {
      expect(featuresOf(plan)).toEqual(PLAN_FEATURES);
    }
    expect(featuresOf('PRO')).toEqual(['ADVANCED_STATS', 'EXCEL_IMPORT']);
  });

  it('pregunta por una función concreta', () => {
    expect(planHasFeature('PRO', 'ADVANCED_STATS')).toBe(true);
    expect(planHasFeature('INDIVIDUAL', 'EXCEL_IMPORT')).toBe(false);
    expect(planHasFeature('PRO', 'CONSOLIDATED_STATS')).toBe(false);
    expect(planHasFeature('TEAM', 'PRIORITY_SUPPORT')).toBe(true);
  });

  it('un plan que el código no conoce no se queda sin funciones', () => {
    expect(featuresOf('ENTERPRISE')).toEqual(PLAN_FEATURES);
  });
});
