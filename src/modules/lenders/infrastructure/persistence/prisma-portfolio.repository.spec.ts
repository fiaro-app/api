import { describe, expect, it, vi } from 'vitest';
import { Portfolio } from '@/modules/lenders/domain/entities/portfolio.entity.js';
import { PortfolioNameTakenError } from '@/modules/lenders/domain/errors/portfolio-name-taken.error.js';
import { PrismaPortfolioRepository } from '@/modules/lenders/infrastructure/persistence/prisma-portfolio.repository.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const portfolio = Portfolio.create({
  id: 'portfolio-1',
  lenderId: 'lender-1',
  name: 'Zona Norte',
  isDefault: false,
  createdAt: CREATED_AT,
});

const row = {
  id: 'portfolio-1',
  lenderId: 'lender-1',
  name: 'Zona Norte',
  isDefault: false,
  createdAt: CREATED_AT,
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
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const deleteMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count: 1 }),
  );
  const repository = new PrismaPortfolioRepository({
    portfolio: { create, findMany, findFirst, update, deleteMany },
  } as unknown as PrismaService);
  return { repository, create, findMany, findFirst, update, deleteMany };
}

describe('PrismaPortfolioRepository.create', () => {
  it('guarda a la cartera nueva', async () => {
    const { repository, create } = setup();

    await repository.create(portfolio);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'portfolio-1',
        lenderId: 'lender-1',
        name: 'Zona Norte',
        isDefault: false,
        createdAt: CREATED_AT,
      },
    });
  });

  it('traduce un nombre repetido en el prestamista a PortfolioNameTakenError', async () => {
    const { repository, create } = setup();
    create.mockRejectedValueOnce(prismaError('P2002'));

    await expect(repository.create(portfolio)).rejects.toBeInstanceOf(
      PortfolioNameTakenError,
    );
  });

  it('deja pasar cualquier otro error tal cual', async () => {
    const { repository, create } = setup();
    const other = new Error('otro error');
    create.mockRejectedValueOnce(other);

    await expect(repository.create(portfolio)).rejects.toBe(other);
  });
});

describe('PrismaPortfolioRepository.listByLender', () => {
  it('devuelve las carteras del prestamista, de más antigua a más nueva', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([row]);

    const found = await repository.listByLender('lender-1');

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { lenderId: 'lender-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(found).toEqual([portfolio]);
  });
});

describe('PrismaPortfolioRepository.findById', () => {
  it('busca dentro del prestamista y devuelve la cartera', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('portfolio-1', 'lender-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'portfolio-1', lenderId: 'lender-1' },
    });
    expect(found).toEqual(portfolio);
  });

  it('devuelve null si no existe, o es de otro prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findById('portfolio-1', 'lender-2'),
    ).resolves.toBeNull();
  });
});

describe('PrismaPortfolioRepository.update', () => {
  it('guarda el nombre nuevo, acotado al prestamista', async () => {
    const { repository, update } = setup();

    await repository.update(portfolio.rename('Zona Sur'));

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'portfolio-1', lenderId: 'lender-1' },
      data: { name: 'Zona Sur' },
    });
  });

  it('traduce un nombre repetido en el prestamista a PortfolioNameTakenError', async () => {
    const { repository, update } = setup();
    update.mockRejectedValueOnce(prismaError('P2002'));

    await expect(
      repository.update(portfolio.rename('Zona Sur')),
    ).rejects.toBeInstanceOf(PortfolioNameTakenError);
  });

  it('deja pasar cualquier otro error tal cual', async () => {
    const { repository, update } = setup();
    const other = new Error('otro error');
    update.mockRejectedValueOnce(other);

    await expect(repository.update(portfolio)).rejects.toBe(other);
  });
});

describe('PrismaPortfolioRepository.delete', () => {
  it('borra solo si la cartera es del prestamista', async () => {
    const { repository, deleteMany } = setup();

    await repository.delete('portfolio-1', 'lender-1');

    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'portfolio-1', lenderId: 'lender-1' },
    });
  });
});
