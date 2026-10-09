import { describe, expect, it, vi } from 'vitest';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import { PrismaDailySettlementRepository } from '@/modules/settlements/infrastructure/persistence/prisma-daily-settlement.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const SUBMITTED_AT = new Date('2026-10-01T22:00:00Z');
const CREATED_AT = new Date('2026-10-01T20:00:00Z');

const row = {
  id: 'settlement-1',
  collectorMembershipId: 'membership-1',
  date: '2026-10-01',
  expectedAmount: 100_000,
  collectedAmount: 90_000,
  collectedCash: 60_000,
  collectedNequi: 30_000,
  collectedTransfer: 0,
  status: 'PENDING' as const,
  collectorNote: 'Un cliente no pagó.',
  reviewNote: null,
  reviewedByMembershipId: null,
  reviewedAt: null,
  submittedAt: SUBMITTED_AT,
  createdAt: CREATED_AT,
};

const settlement = DailySettlement.create({
  id: 'settlement-1',
  collectorMembershipId: 'membership-1',
  date: '2026-10-01',
  expectedAmount: 100_000,
  collectedAmount: 90_000,
  collectedCash: 60_000,
  collectedNequi: 30_000,
  collectedTransfer: 0,
  status: 'PENDING',
  collectorNote: 'Un cliente no pagó.',
  reviewNote: null,
  reviewedByMembershipId: null,
  reviewedAt: null,
  submittedAt: SUBMITTED_AT,
  createdAt: CREATED_AT,
});

function setup() {
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const count = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(0),
  );
  const upsert = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(row),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(row),
  );
  const $transaction = vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const repository = new PrismaDailySettlementRepository({
    dailySettlement: { findFirst, findMany, count, upsert, update },
    $transaction,
  } as unknown as PrismaService);
  return { repository, findFirst, findMany, count, upsert, update };
}

describe('PrismaDailySettlementRepository.findById', () => {
  it('devuelve el cuadre si existe para ese prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findById('settlement-1', 'lender-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: {
        id: 'settlement-1',
        collectorMembership: { lenderId: 'lender-1' },
      },
    });
    expect(found).toEqual(settlement);
  });

  it('devuelve null si no existe, o es de otro prestamista', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(
      repository.findById('settlement-1', 'lender-1'),
    ).resolves.toBeNull();
  });
});

describe('PrismaDailySettlementRepository.list', () => {
  it('pagina sin filtros, ordenado por fecha descendente', async () => {
    const { repository, findMany, count } = setup();
    findMany.mockResolvedValueOnce([row]);
    count.mockResolvedValueOnce(1);

    const page = await repository.list({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 10,
    });

    const expectedWhere = { collectorMembership: { lenderId: 'lender-1' } };
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: expectedWhere,
      orderBy: { date: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
    expect(page).toEqual({ items: [settlement], total: 1 });
  });

  it('agrega el filtro por cobrador y por estado cuando llegan', async () => {
    const { repository, findMany, count } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      collectorMembershipId: 'membership-1',
      status: 'PENDING',
    });

    const expectedWhere = {
      collectorMembership: { lenderId: 'lender-1' },
      collectorMembershipId: 'membership-1',
      status: 'PENDING',
    };
    expect(findMany).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
  });

  it('agrega el filtro por cartera y el rango de fechas, inclusive en ambos extremos', async () => {
    const { repository, findMany, count } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      portfolioId: 'portfolio-1',
      from: '2026-10-01',
      to: '2026-10-31',
    });

    const expectedWhere = {
      collectorMembership: { lenderId: 'lender-1', portfolioId: 'portfolio-1' },
      date: { gte: '2026-10-01', lte: '2026-10-31' },
    };
    expect(findMany).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ where: expectedWhere }),
    );
    expect(count).toHaveBeenCalledExactlyOnceWith({ where: expectedWhere });
  });

  it('acota solo por un lado si llega solo from o solo to', async () => {
    const { repository, findMany } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      from: '2026-10-01',
    });
    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      to: '2026-10-31',
    });

    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: '2026-10-01' },
        }) as unknown,
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          date: { lte: '2026-10-31' },
        }) as unknown,
      }),
    );
  });
});

describe('PrismaDailySettlementRepository.upsert', () => {
  it('crea o reemplaza con el id compuesto cobrador+fecha, y devuelve PENDING sin revisión', async () => {
    const { repository, upsert } = setup();

    const result = await repository.upsert({
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 90_000,
      collectedCash: 60_000,
      collectedNequi: 30_000,
      collectedTransfer: 0,
      collectorNote: 'Un cliente no pagó.',
      submittedAt: SUBMITTED_AT,
    });

    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      where: {
        collectorMembershipId_date: {
          collectorMembershipId: 'membership-1',
          date: '2026-10-01',
        },
      },
      create: {
        id: 'settlement-1',
        collectorMembershipId: 'membership-1',
        date: '2026-10-01',
        expectedAmount: 100_000,
        collectedAmount: 90_000,
        collectedCash: 60_000,
        collectedNequi: 30_000,
        collectedTransfer: 0,
        collectorNote: 'Un cliente no pagó.',
        submittedAt: SUBMITTED_AT,
      },
      update: {
        expectedAmount: 100_000,
        collectedAmount: 90_000,
        collectedCash: 60_000,
        collectedNequi: 30_000,
        collectedTransfer: 0,
        collectorNote: 'Un cliente no pagó.',
        submittedAt: SUBMITTED_AT,
        status: 'PENDING',
        reviewNote: null,
        reviewedByMembershipId: null,
        reviewedAt: null,
      },
    });
    expect(result).toEqual(settlement);
  });
});

describe('PrismaDailySettlementRepository.review', () => {
  it('guarda la decisión del prestamista', async () => {
    const { repository, update } = setup();
    const reviewedAt = new Date('2026-10-01T23:00:00Z');
    update.mockResolvedValueOnce({
      ...row,
      status: 'APPROVED',
      reviewedByMembershipId: 'membership-2',
      reviewedAt,
    });

    const result = await repository.review({
      id: 'settlement-1',
      status: 'APPROVED',
      reviewNote: null,
      reviewedByMembershipId: 'membership-2',
      reviewedAt,
    });

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'settlement-1' },
      data: {
        status: 'APPROVED',
        reviewNote: null,
        reviewedByMembershipId: 'membership-2',
        reviewedAt,
      },
    });
    expect(result.status).toBe('APPROVED');
  });
});
