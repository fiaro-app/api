import { describe, expect, it, vi } from 'vitest';
import { PrismaLoanPortfolioReadRepository } from '@/modules/collections/infrastructure/persistence/prisma-loan-portfolio-read.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const OCCURRED_AT = new Date('2026-10-05T15:00:00Z');

function setup() {
  const visitFindMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const assignmentFindMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const repository = new PrismaLoanPortfolioReadRepository({
    collectionVisit: { findMany: visitFindMany },
    collectionAssignment: { findMany: assignmentFindMany },
  } as unknown as PrismaService);
  return { repository, visitFindMany, assignmentFindMany };
}

describe('PrismaLoanPortfolioReadRepository.listVisitRecordsByLoans', () => {
  it('trae en una sola consulta las visitas de todos los préstamos, con su pago y reversión', async () => {
    const { repository, visitFindMany } = setup();
    visitFindMany.mockResolvedValueOnce([
      {
        id: 'visit-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        outcome: 'PAID',
        expectedAmount: 10_000,
        promisedDate: null,
        occurredAt: OCCURRED_AT,
        createdAt: OCCURRED_AT,
        payment: {
          id: 'payment-1',
          loanId: 'loan-1',
          visitId: 'visit-1',
          amount: 10_000,
          method: 'CASH',
          occurredAt: OCCURRED_AT,
          createdAt: OCCURRED_AT,
          reversal: null,
        },
      },
    ]);

    const records = await repository.listVisitRecordsByLoans([
      'loan-1',
      'loan-2',
    ]);

    expect(visitFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { loanId: { in: ['loan-1', 'loan-2'] } },
      include: { payment: { include: { reversal: true } } },
      orderBy: { occurredAt: 'asc' },
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.visit.loanId).toBe('loan-1');
    expect(records[0]?.payment?.amount).toBe(10_000);
    expect(records[0]?.reversal).toBeNull();
  });

  it('sin préstamos no consulta nada', async () => {
    const { repository, visitFindMany } = setup();

    await expect(repository.listVisitRecordsByLoans([])).resolves.toEqual([]);
    expect(visitFindMany).not.toHaveBeenCalled();
  });
});

describe('PrismaLoanPortfolioReadRepository.listCollectorsByLoans', () => {
  it('trae las asignaciones vigentes en la fecha y las devuelve por préstamo', async () => {
    const { repository, assignmentFindMany } = setup();
    assignmentFindMany.mockResolvedValueOnce([
      { loanId: 'loan-1', collectorMembershipId: 'membership-1' },
      { loanId: 'loan-2', collectorMembershipId: 'membership-2' },
    ]);

    const collectors = await repository.listCollectorsByLoans(
      ['loan-1', 'loan-2'],
      '2026-10-09',
    );

    expect(assignmentFindMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        loanId: { in: ['loan-1', 'loan-2'] },
        effectiveFrom: { lte: '2026-10-09' },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: '2026-10-09' } }],
      },
      orderBy: { effectiveFrom: 'asc' },
      select: { loanId: true, collectorMembershipId: true },
    });
    expect([...collectors]).toEqual([
      ['loan-1', 'membership-1'],
      ['loan-2', 'membership-2'],
    ]);
  });

  it('si un préstamo tiene dos asignaciones vigentes (cambio de cobrador el mismo día), gana la más reciente', async () => {
    const { repository, assignmentFindMany } = setup();
    assignmentFindMany.mockResolvedValueOnce([
      { loanId: 'loan-1', collectorMembershipId: 'membership-old' },
      { loanId: 'loan-1', collectorMembershipId: 'membership-new' },
    ]);

    const collectors = await repository.listCollectorsByLoans(
      ['loan-1'],
      '2026-10-09',
    );

    expect(collectors.get('loan-1')).toBe('membership-new');
  });

  it('sin préstamos no consulta nada', async () => {
    const { repository, assignmentFindMany } = setup();

    const collectors = await repository.listCollectorsByLoans([], '2026-10-09');

    expect(collectors.size).toBe(0);
    expect(assignmentFindMany).not.toHaveBeenCalled();
  });
});
