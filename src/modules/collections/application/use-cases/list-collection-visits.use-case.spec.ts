import { describe, expect, it, vi } from 'vitest';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { ListCollectionVisitsUseCase } from '@/modules/collections/application/use-cases/list-collection-visits.use-case.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';

function setup(found: readonly CollectionVisitRecord[]) {
  const listByLoan = vi.fn(() => Promise.resolve(found));
  const visits: CollectionVisitRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    listByLoan,
    listByCollectorAndPromisedDate: vi.fn(),
    listByCollectorAndDateRange: vi.fn(),
  };
  const getLoanExecute = vi.fn(() =>
    Promise.resolve({ id: 'loan-1' } as never),
  );
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  return {
    useCase: new ListCollectionVisitsUseCase(visits, getLoan),
    listByLoan,
    getLoanExecute,
  };
}

describe('ListCollectionVisitsUseCase', () => {
  it('confirma que el préstamo exista y devuelve sus visitas', async () => {
    const visit = CollectionVisit.create({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'NOT_FOUND',
      expectedAmount: 30_000,
      promisedDate: null,
      occurredAt: new Date('2026-10-01T14:00:00Z'),
      createdAt: new Date('2026-10-01T14:05:00Z'),
    });
    const { useCase, listByLoan, getLoanExecute } = setup([
      { visit, payment: null, reversal: null },
    ]);

    const found = await useCase.execute('loan-1', 'lender-1');

    expect(getLoanExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
    expect(listByLoan).toHaveBeenCalledExactlyOnceWith('loan-1');
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe('visit-1');
  });

  it('un préstamo sin visitas devuelve una lista vacía', async () => {
    const { useCase } = setup([]);

    expect(await useCase.execute('loan-1', 'lender-1')).toEqual([]);
  });
});
