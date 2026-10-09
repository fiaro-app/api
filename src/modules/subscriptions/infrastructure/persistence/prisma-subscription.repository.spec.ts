import { describe, expect, it, vi } from 'vitest';
import { Subscription } from '@/modules/subscriptions/domain/entities/subscription.entity.js';
import { PrismaSubscriptionRepository } from '@/modules/subscriptions/infrastructure/persistence/prisma-subscription.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const ENDS_AT = new Date('2026-11-08T12:00:00Z');
const CREATED_AT = new Date('2026-10-09T12:00:00Z');

const subscription = Subscription.create({
  id: 'subscription-1',
  tenantId: 'tenant-1',
  planCode: 'TRIAL',
  maxActiveLenders: 1,
  maxCollectors: 5,
  currentPeriodEndsAt: ENDS_AT,
  createdAt: CREATED_AT,
});

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const repository = new PrismaSubscriptionRepository({
    subscription: { create, findUnique },
  } as unknown as PrismaService);
  return { repository, create, findUnique };
}

describe('PrismaSubscriptionRepository', () => {
  it('guarda la suscripción', async () => {
    const { repository, create } = setup();

    await repository.create(subscription);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'subscription-1',
        tenantId: 'tenant-1',
        planCode: 'TRIAL',
        maxActiveLenders: 1,
        maxCollectors: 5,
        currentPeriodEndsAt: ENDS_AT,
        createdAt: CREATED_AT,
      },
    });
  });

  it('busca por Tenant y devuelve la entidad', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce({
      id: 'subscription-1',
      tenantId: 'tenant-1',
      planCode: 'TRIAL',
      maxActiveLenders: 1,
      maxCollectors: 5,
      currentPeriodEndsAt: ENDS_AT,
      createdAt: CREATED_AT,
    });

    const found = await repository.findByTenant('tenant-1');

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { tenantId: 'tenant-1' },
    });
    expect(found).toEqual(subscription);
  });

  it('devuelve null si el Tenant no tiene suscripción', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findByTenant('tenant-1')).resolves.toBeNull();
  });
});
