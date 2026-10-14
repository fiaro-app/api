import { describe, expect, it, vi } from 'vitest';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import { PrismaLoanRepository } from '@/modules/loans/infrastructure/persistence/prisma-loan.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const loan = Loan.create({
  id: 'loan-1',
  lenderId: 'lender-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY',
  startDate: '2026-10-01',
  status: 'ACTIVE',
  createdByMembershipId: 'membership-1',
  createdAt: CREATED_AT,
  closedAt: null,
});

const row = {
  id: 'loan-1',
  lenderId: 'lender-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY' as const,
  startDate: '2026-10-01',
  status: 'ACTIVE' as const,
  createdByMembershipId: 'membership-1',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  closedAt: null,
};

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
  const repository = new PrismaLoanRepository({
    loan: { create, findFirst, findMany, count, update },
    $transaction,
  } as unknown as PrismaService);
  return { repository, create, findFirst, findMany, count, update };
}

describe('PrismaLoanRepository.create', () => {
  it('guarda al préstamo nuevo', async () => {
    const { repository, create } = setup();

    await repository.create(loan);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'loan-1',
        lenderId: 'lender-1',
        clientId: 'client-1',
        principalAmount: 500_000,
        installmentCount: 20,
        installmentValue: 30_000,
        totalPayable: 600_000,
        frequency: 'DAILY',
        startDate: '2026-10-01',
        status: 'ACTIVE',
        createdByMembershipId: 'membership-1',
        createdAt: CREATED_AT,
        closedAt: null,
      },
    });
  });
});

describe('PrismaLoanRepository.findById', () => {
  it('devuelve el préstamo si existe para ese prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('loan-1', 'lender-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'loan-1', lenderId: 'lender-1' },
    });
    expect(found).toEqual(loan);
  });

  it('devuelve null si no existe, o es de otro prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(repository.findById('loan-1', 'lender-1')).resolves.toBeNull();
  });
});

describe('PrismaLoanRepository.list', () => {
  it('con openAt trae los creados antes y no cerrados antes de ese instante', async () => {
    const { repository, findMany } = setup();
    const openAt = new Date('2026-10-01T05:00:00.000Z');

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 10,
      openAt,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          lenderId: 'lender-1',
          createdAt: { lt: openAt },
          OR: [{ closedAt: null }, { closedAt: { gte: openAt } }],
        },
      }),
    );
  });

  it('acota a los ids pedidos cuando llegan', async () => {
    const { repository, findMany } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 10,
      ids: ['loan-1', 'loan-2'],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lenderId: 'lender-1', id: { in: ['loan-1', 'loan-2'] } },
      }),
    );
  });

  it('pagina sin filtros', async () => {
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
    expect(page).toEqual({ items: [loan], total: 1 });
  });

  it('agrega el filtro por cliente y por estado cuando llegan', async () => {
    const { repository, findMany, count } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      clientId: 'client-1',
      status: 'ACTIVE',
    });

    const expectedWhere = {
      lenderId: 'lender-1',
      clientId: 'client-1',
      status: 'ACTIVE',
    };
    expect(findMany).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
  });
});

describe('PrismaLoanRepository.listActiveByClients', () => {
  it('trae en una sola consulta los préstamos ACTIVE de esos clientes, dentro del prestamista', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([row]);

    const found = await repository.listActiveByClients('lender-1', [
      'client-1',
      'client-2',
    ]);

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        lenderId: 'lender-1',
        clientId: { in: ['client-1', 'client-2'] },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(found).toEqual([loan]);
  });
});

describe('PrismaLoanRepository.update', () => {
  it('reemplaza los datos del préstamo, con su lenderId en el where', async () => {
    const { repository, update } = setup();
    const canceled = Loan.create({
      id: 'loan-1',
      lenderId: 'lender-1',
      clientId: 'client-1',
      principalAmount: 500_000,
      installmentCount: 20,
      installmentValue: 30_000,
      totalPayable: 600_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
      status: 'CANCELED',
      createdByMembershipId: 'membership-1',
      createdAt: CREATED_AT,
      closedAt: CREATED_AT,
    });

    await repository.update(canceled);

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'loan-1', lenderId: 'lender-1' },
      data: {
        id: 'loan-1',
        lenderId: 'lender-1',
        clientId: 'client-1',
        principalAmount: 500_000,
        installmentCount: 20,
        installmentValue: 30_000,
        totalPayable: 600_000,
        frequency: 'DAILY',
        startDate: '2026-10-01',
        status: 'CANCELED',
        createdByMembershipId: 'membership-1',
        createdAt: CREATED_AT,
        closedAt: CREATED_AT,
      },
    });
  });
});
