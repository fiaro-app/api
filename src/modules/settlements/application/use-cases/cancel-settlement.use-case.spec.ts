import { describe, expect, it, vi } from 'vitest';
import { CancelSettlementUseCase } from '@/modules/settlements/application/use-cases/cancel-settlement.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import { SettlementNotCancelableError } from '@/modules/settlements/domain/errors/settlement-not-cancelable.error.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import type { SettlementStatus } from '@/modules/settlements/domain/entities/settlement-status.js';

const NOW = new Date('2026-10-15T20:00:00Z');

function settlement(status: SettlementStatus, collector = 'membership-1') {
  return DailySettlement.create({
    id: 'settlement-1',
    collectorMembershipId: collector,
    date: '2026-10-15',
    expectedAmount: 10_000,
    collectedAmount: 10_000,
    collectedCash: 10_000,
    collectedNequi: 0,
    collectedTransfer: 0,
    status,
    collectorNote: null,
    reviewNote: null,
    reviewedByMembershipId: null,
    reviewedAt: null,
    submittedAt: NOW,
    createdAt: NOW,
  });
}

function setup(found: DailySettlement | null) {
  const remove = vi.fn(() => Promise.resolve());
  const useCase = new CancelSettlementUseCase({
    findById: vi.fn(() => Promise.resolve(found)),
    delete: remove,
  } as never);
  return { useCase, remove };
}

const INPUT = {
  settlementId: 'settlement-1',
  lenderId: 'lender-1',
  collectorMembershipId: 'membership-1',
};

describe('CancelSettlementUseCase', () => {
  it('borra el cuadre propio que sigue en revisión', async () => {
    const { useCase, remove } = setup(settlement('PENDING'));

    await useCase.execute(INPUT);

    expect(remove).toHaveBeenCalledWith('settlement-1');
  });

  it('no cancela uno ya aprobado ni rechazado', async () => {
    for (const status of ['APPROVED', 'REJECTED'] as const) {
      const { useCase, remove } = setup(settlement(status));

      await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
        SettlementNotCancelableError,
      );
      expect(remove).not.toHaveBeenCalled();
    }
  });

  it('el cuadre de otro cobrador, o uno que no existe, responde como no encontrado', async () => {
    for (const found of [settlement('PENDING', 'otro'), null]) {
      const { useCase, remove } = setup(found);

      await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
        SettlementNotFoundError,
      );
      expect(remove).not.toHaveBeenCalled();
    }
  });
});
