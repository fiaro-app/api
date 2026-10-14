import { describe, expect, it, vi } from 'vitest';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { MembershipAlreadyExistsError } from '@/modules/memberships/domain/errors/membership-already-exists.error.js';
import { PrismaMembershipRepository } from '@/modules/memberships/infrastructure/persistence/prisma-membership.repository.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
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

const row = {
  id: 'membership-1',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
};

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error de prueba', {
    code,
    clientVersion: 'test',
  });

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const count = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(0),
  );
  const repository = new PrismaMembershipRepository({
    membership: { create, findFirst, findMany, update, count },
  } as unknown as PrismaService);
  return { repository, create, findFirst, findMany, update, count };
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

  it('traduce una membresía repetida para la misma persona y prestamista a MembershipAlreadyExistsError', async () => {
    const { repository, create } = setup();
    create.mockRejectedValueOnce(prismaError('P2002'));

    await expect(repository.create(membership)).rejects.toBeInstanceOf(
      MembershipAlreadyExistsError,
    );
  });

  it('deja pasar cualquier otro error tal cual', async () => {
    const { repository, create } = setup();
    const other = new Error('otro error');
    create.mockRejectedValueOnce(other);

    await expect(repository.create(membership)).rejects.toBe(other);
  });
});

describe('PrismaMembershipRepository.findById', () => {
  it('devuelve la membresía si existe para ese prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('membership-1', 'lender-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'membership-1', lenderId: 'lender-1' },
    });
    expect(found?.id).toBe('membership-1');
  });

  it('devuelve null si no existe, o es de otro prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findById('membership-1', 'lender-1'),
    ).resolves.toBeNull();
  });
});

describe('PrismaMembershipRepository.findActiveByUserId', () => {
  it('devuelve las membresías activas, de la más antigua a la más nueva', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([row]);

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

describe('PrismaMembershipRepository.findActiveByLenderAndRoles', () => {
  it('filtra por prestamista, ACTIVE y al menos uno de los roles pedidos', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([row]);

    const found = await repository.findActiveByLenderAndRoles('lender-1', [
      'OWNER',
      'LENDER',
    ]);

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        lenderId: 'lender-1',
        status: 'ACTIVE',
        roles: { hasSome: ['OWNER', 'LENDER'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(found).toHaveLength(1);
  });
});

describe('PrismaMembershipRepository.countActiveByPortfolio', () => {
  it('cuenta solo las activas de esa cartera, dentro del prestamista', async () => {
    const { repository, count } = setup();
    count.mockResolvedValueOnce(2);

    const total = await repository.countActiveByPortfolio(
      'portfolio-1',
      'lender-1',
    );

    expect(total).toBe(2);
    expect(count).toHaveBeenCalledExactlyOnceWith({
      where: {
        portfolioId: 'portfolio-1',
        lenderId: 'lender-1',
        status: 'ACTIVE',
      },
    });
  });
});

describe('PrismaMembershipRepository.update', () => {
  it('reemplaza los datos de la membresía, con su lenderId en el where', async () => {
    const { repository, update } = setup();

    await repository.update(membership);

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'membership-1', lenderId: 'lender-1' },
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
