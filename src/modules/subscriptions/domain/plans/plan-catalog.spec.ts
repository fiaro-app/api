import { describe, expect, it } from 'vitest';
import {
  PLAN_CATALOG,
  SUBSCRIPTION_PLAN_CODES,
} from '@/modules/subscriptions/domain/plans/plan-catalog.js';

describe('PLAN_CATALOG', () => {
  it('define los límites de cada plan', () => {
    expect(Object.keys(PLAN_CATALOG).sort()).toEqual(
      [...SUBSCRIPTION_PLAN_CODES].sort(),
    );
  });

  it('cada plan de pago da más que el anterior', () => {
    const { INDIVIDUAL, PRO, TEAM } = PLAN_CATALOG;
    expect(PRO.maxCollectors).toBeGreaterThan(INDIVIDUAL.maxCollectors);
    expect(PRO.maxAdmins).toBeGreaterThan(INDIVIDUAL.maxAdmins);
    expect(TEAM.maxActiveLenders).toBeGreaterThan(PRO.maxActiveLenders);
    expect(TEAM.maxPortfolios).toBeGreaterThan(PRO.maxPortfolios);
    expect(INDIVIDUAL.maxActiveLoans).not.toBeNull();
    expect(PRO.maxActiveLoans).toBeNull();
  });
});
