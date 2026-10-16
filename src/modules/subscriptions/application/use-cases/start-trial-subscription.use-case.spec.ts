import { describe, expect, it, vi } from 'vitest';
import type { TrialSubscriptionSettings } from '@/modules/subscriptions/application/ports/trial-subscription-settings.port.js';
import { StartTrialSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/start-trial-subscription.use-case.js';
import type { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import type { SubscriptionRepository } from '@/modules/subscriptions/domain/repositories/subscription.repository.js';

const NOW = new Date('2026-10-09T12:00:00Z');

describe('StartTrialSubscriptionUseCase', () => {
  it('crea la prueba con los días y los límites de la configuración', async () => {
    const saved: Subscription[] = [];
    const subscriptions: SubscriptionRepository = {
      create: vi.fn((subscription: Subscription) => {
        saved.push(subscription);
        return Promise.resolve();
      }),
      findByTenant: vi.fn(),
    };
    const settings: TrialSubscriptionSettings = {
      trialDays: () => 30,
      maxActiveLenders: () => 1,
      maxCollectors: () => 5,
    };
    const useCase = new StartTrialSubscriptionUseCase(
      subscriptions,
      settings,
      { next: () => 'subscription-1' },
      { now: () => NOW },
    );

    await useCase.execute('tenant-1');

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      id: 'subscription-1',
      tenantId: 'tenant-1',
      planCode: 'TRIAL',
      maxActiveLenders: 1,
      maxCollectors: 5,
      maxAdmins: 3,
      maxPortfolios: 4,
      maxActiveLoans: null,
      currentPeriodEndsAt: new Date('2026-11-08T12:00:00Z'),
      createdAt: NOW,
    });
  });
});
