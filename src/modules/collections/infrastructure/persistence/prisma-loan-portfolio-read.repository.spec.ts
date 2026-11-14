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

describe('PrismaLoanPortfolioReadRepository: nombres en lote', () => {
  function namesSetup() {
    const clientFindMany = vi.fn(() =>
      Promise.resolve([{ id: 'client-1', fullName: 'Ana' }]),
    );
    const membershipFindMany = vi.fn(() =>
      Promise.resolve([{ id: 'm1', user: { fullName: 'Luis' } }]),
    );
    const repository = new PrismaLoanPortfolioReadRepository({
      client: { findMany: clientFindMany },
      membership: { findMany: membershipFindMany },
    } as unknown as PrismaService);
    return { repository, clientFindMany, membershipFindMany };
  }

  it('trae los nombres de clientes y cobradores en una consulta cada uno, del prestamista', async () => {
    const { repository, clientFindMany, membershipFindMany } = namesSetup();

    const clients = await repository.listClientNames(['client-1'], 'lender-1');
    const members = await repository.listMembershipNames(['m1'], 'lender-1');

    expect(clients.get('client-1')).toBe('Ana');
    expect(members.get('m1')).toBe('Luis');
    expect(clientFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { lenderId: 'lender-1', id: { in: ['client-1'] } },
      select: { id: true, fullName: true },
    });
    expect(membershipFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { lenderId: 'lender-1', id: { in: ['m1'] } },
      select: { id: true, user: { select: { fullName: true } } },
    });
  });

  it('sin ids no consulta', async () => {
    const { repository, clientFindMany, membershipFindMany } = namesSetup();

    expect((await repository.listClientNames([], 'lender-1')).size).toBe(0);
    expect((await repository.listMembershipNames([], 'lender-1')).size).toBe(0);
    expect(clientFindMany).not.toHaveBeenCalled();
    expect(membershipFindMany).not.toHaveBeenCalled();
  });
});
