import { describe, expect, it, vi } from 'vitest';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
import { ClientNationalIdTakenError } from '@/modules/clients/domain/errors/client-national-id-taken.error.js';
import { PrismaClientRepository } from '@/modules/clients/infrastructure/persistence/prisma-client.repository.js';
import { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const client = Client.create({
  id: 'client-1',
  lenderId: 'lender-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: CREATED_AT,
});

const row = {
  id: 'client-1',
  lenderId: 'lender-1',
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
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
  const count = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(0),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const $transaction = vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const repository = new PrismaClientRepository({
    client: { create, findFirst, findMany, count, update },
    $transaction,
  } as unknown as PrismaService);
  return { repository, create, findFirst, findMany, count, update };
}

describe('PrismaClientRepository.create', () => {
  it('guarda al cliente nuevo', async () => {
    const { repository, create } = setup();

    await repository.create(client);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'client-1',
        lenderId: 'lender-1',
        nationalId: '1020304050',
        fullName: 'Carlos Andrés Gómez',
        occupation: 'Vendedor ambulante',
        phone: '+573001234567',
        address: 'Calle 45 # 12-30, Bogotá',
        createdAt: CREATED_AT,
      },
    });
  });

  it('traduce una cédula repetida en el prestamista a ClientNationalIdTakenError', async () => {
    const { repository, create } = setup();
    create.mockRejectedValueOnce(prismaError('P2002'));

    await expect(repository.create(client)).rejects.toBeInstanceOf(
      ClientNationalIdTakenError,
    );
  });

  it('deja pasar cualquier otro error tal cual', async () => {
    const { repository, create } = setup();
    const other = new Error('otro error');
    create.mockRejectedValueOnce(other);

    await expect(repository.create(client)).rejects.toBe(other);
  });
});

describe('PrismaClientRepository.findById', () => {
  it('devuelve al cliente si existe para ese prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('client-1', 'lender-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'client-1', lenderId: 'lender-1' },
    });
    expect(found).toEqual(client);
  });

  it('devuelve null si no existe, o es de otro prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findById('client-1', 'lender-1'),
    ).resolves.toBeNull();
  });
});

describe('PrismaClientRepository.list', () => {
  it('pagina sin filtro de búsqueda', async () => {
    const { repository, findMany, count } = setup();
    findMany.mockResolvedValueOnce([row]);
    count.mockResolvedValueOnce(1);

    const page = await repository.list({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 10,
    });

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { lenderId: 'lender-1' },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledExactlyOnceWith({
      where: { lenderId: 'lender-1' },
    });
    expect(page).toEqual({ items: [client], total: 1 });
  });

  it('agrega la búsqueda por nombre o cédula cuando llega', async () => {
    const { repository, findMany, count } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      search: 'Gómez',
    });

    const expectedWhere = {
      lenderId: 'lender-1',
      OR: [
        { fullName: { contains: 'Gómez', mode: 'insensitive' } },
        { nationalId: { contains: 'Gómez' } },
      ],
    };
    expect(findMany).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
  });
});

describe('PrismaClientRepository.update', () => {
  it('reemplaza los datos del cliente, con su lenderId en el where', async () => {
    const { repository, update } = setup();

    await repository.update(client);

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'client-1', lenderId: 'lender-1' },
      data: {
        id: 'client-1',
        lenderId: 'lender-1',
        nationalId: '1020304050',
        fullName: 'Carlos Andrés Gómez',
        occupation: 'Vendedor ambulante',
        phone: '+573001234567',
        address: 'Calle 45 # 12-30, Bogotá',
        createdAt: CREATED_AT,
      },
    });
  });

  it('traduce una cédula repetida en el prestamista a ClientNationalIdTakenError', async () => {
    const { repository, update } = setup();
    update.mockRejectedValueOnce(prismaError('P2002'));

    await expect(repository.update(client)).rejects.toBeInstanceOf(
      ClientNationalIdTakenError,
    );
  });

  it('deja pasar cualquier otro error tal cual', async () => {
    const { repository, update } = setup();
    const other = new Error('otro error');
    update.mockRejectedValueOnce(other);

    await expect(repository.update(client)).rejects.toBe(other);
  });
});
