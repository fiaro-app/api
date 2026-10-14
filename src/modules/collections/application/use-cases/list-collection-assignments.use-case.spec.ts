import { describe, expect, it, vi } from 'vitest';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

function setup(found: readonly CollectionAssignment[]) {
  const listByLoan = vi.fn(() => Promise.resolve(found));
  const assignments: CollectionAssignmentRepository = {
    listOpenByCollector: vi.fn(() => Promise.resolve([])),
    reassign: vi.fn(() => Promise.resolve()),
    create: vi.fn(),
    update: vi.fn(),
    findOpenByLoan: vi.fn(),
    listByLoan,
    findActiveByCollectorAndDate: vi.fn(),
  };
  const getLoanExecute = vi.fn(() =>
    Promise.resolve({ id: 'loan-1' } as never),
  );
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  return {
    useCase: new ListCollectionAssignmentsUseCase(assignments, getLoan),
    listByLoan,
    getLoanExecute,
  };
}

describe('ListCollectionAssignmentsUseCase', () => {
  it('confirma que el préstamo exista y devuelve sus asignaciones', async () => {
    const assignment = CollectionAssignment.create({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      createdAt: CREATED_AT,
    });
    const { useCase, listByLoan, getLoanExecute } = setup([assignment]);

    const found = await useCase.execute('loan-1', 'lender-1');

    expect(getLoanExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
    expect(listByLoan).toHaveBeenCalledExactlyOnceWith('loan-1');
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe('assignment-1');
  });

  it('un préstamo sin asignaciones devuelve una lista vacía', async () => {
    const { useCase } = setup([]);

    expect(await useCase.execute('loan-1', 'lender-1')).toEqual([]);
  });
});
