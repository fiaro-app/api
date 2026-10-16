import { describe, expect, it, vi } from 'vitest';
import type { CountLendersByTenantUseCase } from '@/modules/lenders/application/use-cases/count-lenders-by-tenant.use-case.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { CountActiveLoansUseCase } from '@/modules/loans/application/use-cases/count-active-loans.use-case.js';
import type { CountAdminSeatsUseCase } from '@/modules/memberships/application/use-cases/count-admin-seats.use-case.js';
import type { CountCollectorSeatsUseCase } from '@/modules/memberships/application/use-cases/count-collector-seats.use-case.js';
import { GetSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/get-subscription.use-case.js';
import { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import { SubscriptionNotFoundError } from '@/modules/subscriptions/domain/errors/subscription-not-found.error.js';

const NOW = new Date('2026-10-09T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function subscriptionEndingIn(days: number): Subscription {
  return Subscription.create({
    id: 'subscription-1',
    tenantId: 'tenant-1',
    planCode: 'TRIAL',
    maxActiveLenders: 1,
    maxCollectors: 5,
    maxAdmins: 3,
    maxPortfolios: 4,
    maxActiveLoans: null,
    currentPeriodEndsAt: new Date(NOW.getTime() + days * DAY_MS),
    createdAt: new Date('2026-09-09T12:00:00Z'),
  });
}

function setup(found: Subscription | null) {
  const findByTenant = vi.fn(() => Promise.resolve(found));
  const listExecute = vi.fn(() => Promise.resolve(3));
  const useCase = new GetSubscriptionUseCase(
    { create: vi.fn(), findByTenant },
    {
      execute: vi.fn(() => Promise.resolve({ tenantId: 'tenant-1' })),
    } as unknown as GetLenderUseCase,
    {
      execute: vi.fn(() => Promise.resolve(2)),
    } as unknown as CountLendersByTenantUseCase,
    { execute: listExecute } as unknown as CountCollectorSeatsUseCase,
    {
      execute: vi.fn(() => Promise.resolve(2)),
    } as unknown as CountAdminSeatsUseCase,
    {
      execute: vi.fn(() => Promise.resolve(7)),
    } as unknown as CountActiveLoansUseCase,
    { now: () => NOW },
  );
  return { useCase, findByTenant, listExecute };
}

describe('GetSubscriptionUseCase', () => {
  it('devuelve el plan activo con sus límites y su uso', async () => {
    const { useCase, findByTenant, listExecute } = setup(
      subscriptionEndingIn(10),
    );

    const details = await useCase.execute('lender-1');

    expect(findByTenant).toHaveBeenCalledExactlyOnceWith('tenant-1');
    expect(listExecute).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(details).toMatchObject({
      planCode: 'TRIAL',
      status: 'ACTIVE',
      daysRemaining: 10,
      graceDaysRemaining: 0,
      isReadOnly: false,
      limits: { maxActiveLenders: 1, maxCollectors: 5 },
      usage: {
        activeLenders: 2,
        activeCollectors: 3,
        activeAdmins: 2,
        activeLoans: 7,
      },
    });
  });

  it('marca la gracia y el solo lectura según la fecha', async () => {
    const grace = await setup(subscriptionEndingIn(-2)).useCase.execute('l');
    const readOnly = await setup(subscriptionEndingIn(-20)).useCase.execute(
      'l',
    );

    expect(grace).toMatchObject({
      status: 'GRACE_PERIOD',
      graceDaysRemaining: 5,
      isReadOnly: false,
    });
    expect(readOnly).toMatchObject({ status: 'READ_ONLY', isReadOnly: true });
  });

  it('lanza SubscriptionNotFoundError si el Tenant no tiene suscripción', async () => {
    const { useCase } = setup(null);

    await expect(useCase.execute('lender-1')).rejects.toBeInstanceOf(
      SubscriptionNotFoundError,
    );
  });
});
