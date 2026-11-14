import { describe, expect, it, vi } from 'vitest';
import { PrismaCollectionVisitReportRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-visit-report.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const OCCURRED_AT = new Date('2026-10-09T15:00:00Z');

const PAID_RECORD = {
  id: 'visit-1',
  occurredAt: OCCURRED_AT,
  outcome: 'PAID' as const,
  expectedAmount: 10_000,
  promisedDate: null,
  loan: {
    id: 'loan-1',
    client: { id: 'client-1', fullName: 'Carlos Ramírez' },
  },
  membership: { id: 'membership-1', user: { fullName: 'Ana Cobradora' } },
  payment: {
    id: 'payment-1',
    amount: 10_000,
    method: 'CASH' as const,
    reversal: null,
  },
};

function setup() {
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const count = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(0),
  );
  const $transaction = vi.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const repository = new PrismaCollectionVisitReportRepository({
    collectionVisit: { findMany, count },
    $transaction,
  } as unknown as PrismaService);
  return { repository, findMany, count };
}

const BASE = {
  lenderId: 'lender-1',
  from: '2026-10-09',
  to: '2026-10-09',
  page: 1,
  pageSize: 20,
};

/** El día de calendario 2026-10-09 en Bogotá (UTC-5): de las 05:00Z a las 05:00Z del día siguiente. */
const DAY = {
  gte: new Date('2026-10-09T05:00:00.000Z'),
  lt: new Date('2026-10-10T05:00:00.000Z'),
};

describe('PrismaCollectionVisitReportRepository.search', () => {
  it('filtra por el prestamista del préstamo y por el día de Bogotá, de la más reciente a la más antigua', async () => {
    const { repository, findMany, count } = setup();

    await repository.search({ ...BASE, page: 2, pageSize: 10 });

    const where = { loan: { lenderId: 'lender-1' }, occurredAt: DAY };
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledExactlyOnceWith({ where });
  });

  it('suma los filtros opcionales cuando llegan', async () => {
    const { repository, findMany } = setup();

    await repository.search({
      ...BASE,
      collectorMembershipId: 'membership-1',
      portfolioId: 'portfolio-1',
      outcome: 'REFUSED',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          loan: { lenderId: 'lender-1' },
          occurredAt: DAY,
          outcome: 'REFUSED',
          collectorMembershipId: 'membership-1',
          membership: { portfolioId: 'portfolio-1' },
        },
      }),
    );
  });

  it('traduce cada visita a su fila, con el pago vigente', async () => {
    const { repository, findMany, count } = setup();
    findMany.mockResolvedValueOnce([PAID_RECORD]);
    count.mockResolvedValueOnce(1);

    const page = await repository.search(BASE);

    expect(page).toEqual({
      total: 1,
      items: [
        {
          visitId: 'visit-1',
          occurredAt: OCCURRED_AT,
          outcome: 'PAID',
          expectedAmount: 10_000,
          promisedDate: null,
          loanId: 'loan-1',
          clientId: 'client-1',
          clientFullName: 'Carlos Ramírez',
          collectorMembershipId: 'membership-1',
          collectorFullName: 'Ana Cobradora',
          payment: {
            id: 'payment-1',
            amount: 10_000,
            method: 'CASH',
            reversed: false,
          },
        },
      ],
    });
  });

  it('marca el pago como reversado si tiene una reversión, y deja payment en null si no hubo pago', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([
      {
        ...PAID_RECORD,
        payment: { ...PAID_RECORD.payment, reversal: { id: 'reversal-1' } },
      },
      { ...PAID_RECORD, id: 'visit-2', outcome: 'NOT_FOUND', payment: null },
    ]);

    const page = await repository.search(BASE);

    expect(page.items[0]?.payment?.reversed).toBe(true);
    expect(page.items[1]?.payment).toBeNull();
  });
});

describe('PrismaCollectionVisitReportRepository.summarizeRoutes', () => {
  it('pide las visitas del rango y las resume por cobrador y día, sin contar los pagos revertidos', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([
      {
        occurredAt: OCCURRED_AT,
        outcome: 'PAID',
        expectedAmount: 10_000,
        collectorMembershipId: 'membership-1',
        membership: { user: { fullName: 'Ana Cobradora' } },
        payment: { amount: 10_000, reversal: null },
      },
      {
        occurredAt: new Date('2026-10-09T18:00:00Z'),
        outcome: 'PAID',
        expectedAmount: 10_000,
        collectorMembershipId: 'membership-1',
        membership: { user: { fullName: 'Ana Cobradora' } },
        payment: { amount: 10_000, reversal: { id: 'reversal-1' } },
      },
      {
        occurredAt: new Date('2026-10-09T19:00:00Z'),
        outcome: 'NOT_FOUND',
        expectedAmount: 10_000,
        collectorMembershipId: 'membership-1',
        membership: { user: { fullName: 'Ana Cobradora' } },
        payment: null,
      },
    ]);

    const days = await repository.summarizeRoutes({
      lenderId: 'lender-1',
      from: '2026-10-09',
      to: '2026-10-09',
    });

    expect(days).toEqual([
      {
        date: '2026-10-09',
        collectorMembershipId: 'membership-1',
        collectorFullName: 'Ana Cobradora',
        startedAt: OCCURRED_AT,
        endedAt: new Date('2026-10-09T19:00:00Z'),
        visitsCount: 3,
        paidCount: 2,
        expectedAmount: 30_000,
        collectedAmount: 10_000,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { occurredAt: 'asc' } }),
    );
  });
});
