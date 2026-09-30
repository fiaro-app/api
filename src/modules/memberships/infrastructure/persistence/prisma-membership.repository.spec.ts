import { describe, expect, it, vi } from 'vitest';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { PrismaMembershipRepository } from '@/modules/memberships/infrastructure/persistence/prisma-membership.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const membership = Membership.create({
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
});

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findUnique = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const repository = new PrismaMembershipRepository({
    membership: { create, findUnique, findMany },
  } as unknown as PrismaService);
  return { repository, create, findUnique, findMany };
}

describe('PrismaMembershipRepository.create', () => {
  it('guarda la membresía', async () => {
    const { repository, create } = setup();

    await repository.create(membership);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'membership-1',
        userId: 'user-1',
        lenderId: 'lender-1',
        roles: ['OWNER', 'LENDER', 'COLLECTOR'],
        status: 'ACTIVE',
        portfolioId: 'portfolio-1',
        createdAt: CREATED_AT,
        deactivatedAt: null,
      },
    });
  });
});

describe('PrismaMembershipRepository.findById', () => {
  it('devuelve la membresía si existe', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce({
      id: 'membership-1',
      userId: 'user-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      status: 'ACTIVE',
      portfolioId: 'portfolio-1',
      createdAt: CREATED_AT,
      deactivatedAt: null,
    });

    const found = await repository.findById('membership-1');

    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'membership-1' },
    });
    expect(found?.id).toBe('membership-1');
  });

  it('devuelve null si no existe', async () => {
    const { repository, findUnique } = setup();
    findUnique.mockResolvedValueOnce(null);

    await expect(repository.findById('membership-1')).resolves.toBeNull();
  });
});

describe('PrismaMembershipRepository.findActiveByUserId', () => {
  it('devuelve las membresías activas, de la más antigua a la más nueva', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([
      {
        id: 'membership-1',
        userId: 'user-1',
        lenderId: 'lender-1',
        roles: ['OWNER', 'LENDER', 'COLLECTOR'],
        status: 'ACTIVE',
        portfolioId: 'portfolio-1',
        createdAt: CREATED_AT,
        deactivatedAt: null,
      },
    ]);

    const found = await repository.findActiveByUserId('user-1');

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'user-1', status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe('membership-1');
  });

  it('sin membresías activas devuelve una lista vacía', async () => {
    const { repository } = setup();

    await expect(repository.findActiveByUserId('user-1')).resolves.toEqual([]);
  });
});
