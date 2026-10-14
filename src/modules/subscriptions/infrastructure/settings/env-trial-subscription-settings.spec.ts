import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { EnvTrialSubscriptionSettings } from '@/modules/subscriptions/infrastructure/settings/env-trial-subscription-settings.js';

describe('EnvTrialSubscriptionSettings', () => {
  it('devuelve los días y los límites configurados', () => {
    const settings = new EnvTrialSubscriptionSettings({
      subscription: {
        trialDays: 14,
        trialMaxActiveLenders: 2,
        trialMaxCollectors: 8,
      },
    } as Env);

    expect(settings.trialDays()).toBe(14);
    expect(settings.maxActiveLenders()).toBe(2);
    expect(settings.maxCollectors()).toBe(8);
  });
});
