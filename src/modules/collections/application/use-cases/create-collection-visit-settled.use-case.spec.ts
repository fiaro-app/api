import { describe, expect, it, vi } from 'vitest';
import { CreateCollectionVisitUseCase } from '@/modules/collections/application/use-cases/create-collection-visit.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { DayAlreadySettledError } from '@/modules/collections/domain/errors/day-already-settled.error.js';

const NOW = new Date('2026-10-15T20:00:00Z');

function setup(settled: boolean) {
  const create = vi.fn(() => Promise.resolve());
  const isDaySettled = vi.fn(() => Promise.resolve(settled));
  const useCase = new CreateCollectionVisitUseCase(
    { findById: vi.fn(() => Promise.resolve(null)), create } as never,
    {
      findActiveByCollectorAndDate: vi.fn(() =>
        Promise.resolve([
          CollectionAssignment.create({
            id: 'assignment-1',
            loanId: 'loan-1',
            collectorMembershipId: 'membership-1',
            effectiveFrom: '2026-09-01',
            effectiveTo: null,
            createdAt: NOW,
          }),
        ]),
      ),
    } as never,
    {
      execute: vi.fn(() =>
        Promise.resolve({ id: 'loan-1', installmentValue: 10_000 }),
      ),
    } as never,
    { execute: vi.fn() } as never,
    { execute: isDaySettled } as never,
    { next: () => 'payment-1' },
    { now: () => NOW },
  );
  return { useCase, create, isDaySettled };
}

const INPUT = {
  id: 'visit-1',
  loanId: 'loan-1',
  lenderId: 'lender-1',
  collectorMembershipId: 'membership-1',
  outcome: 'NOT_FOUND' as const,
  occurredAt: new Date('2026-10-15T18:00:00Z'),
};

describe('CreateCollectionVisitUseCase: cuadre del día enviado', () => {
  it('no registra la visita si ese día ya envió el cuadre', async () => {
    const { useCase, create, isDaySettled } = setup(true);

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      DayAlreadySettledError,
    );
    expect(isDaySettled).toHaveBeenCalledWith('membership-1', '2026-10-15');
    expect(create).not.toHaveBeenCalled();
  });

  it('registra la visita si el día sigue abierto', async () => {
    const { useCase, create } = setup(false);

    await useCase.execute(INPUT);

    expect(create).toHaveBeenCalledTimes(1);
  });
});
