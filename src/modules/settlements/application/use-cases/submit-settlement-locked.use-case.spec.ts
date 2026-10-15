import { describe, expect, it, vi } from 'vitest';
import { SubmitSettlementUseCase } from '@/modules/settlements/application/use-cases/submit-settlement.use-case.js';
import { SettlementLockedError } from '@/modules/settlements/domain/errors/settlement-locked.error.js';

const NOW = new Date('2026-10-15T22:00:00Z');
const INPUT = {
  lenderId: 'lender-1',
  collectorMembershipId: 'membership-1',
  expectedAmount: 10_000,
  collectedCash: 10_000,
  collectedNequi: 0,
  collectedTransfer: 0,
  collectorNote: null,
};

function setup(current: { status: string } | null) {
  const upsert = vi.fn(() =>
    Promise.resolve({ id: 'settlement-1', status: 'PENDING' }),
  );
  const useCase = new SubmitSettlementUseCase(
    {
      findByCollectorAndDate: vi.fn(() => Promise.resolve(current)),
      upsert,
    } as never,
    { execute: vi.fn(() => Promise.resolve([])) } as never,
    { execute: vi.fn() } as never,
    { next: () => 'id' },
    { now: () => NOW },
  );
  return { useCase, upsert };
}

describe('SubmitSettlementUseCase: cuadre ya enviado', () => {
  it('no reenvía si el de hoy sigue en revisión o ya está aprobado', async () => {
    for (const status of ['PENDING', 'APPROVED']) {
      const { useCase, upsert } = setup({ status });

      await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
        SettlementLockedError,
      );
      expect(upsert).not.toHaveBeenCalled();
    }
  });

  it('sí reenvía si el de hoy fue rechazado', async () => {
    const { useCase, upsert } = setup({ status: 'REJECTED' });

    await useCase.execute(INPUT);

    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
