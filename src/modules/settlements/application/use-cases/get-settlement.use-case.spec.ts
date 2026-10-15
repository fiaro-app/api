import { describe, expect, it, vi } from 'vitest';
import { GetSettlementUseCase } from '@/modules/settlements/application/use-cases/get-settlement.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';

const SETTLEMENT = DailySettlement.create({
  id: 'settlement-1',
  collectorMembershipId: 'membership-1',
  date: '2026-10-01',
  expectedAmount: 100_000,
  collectedAmount: 100_000,
  collectedCash: 100_000,
  collectedNequi: 0,
  collectedTransfer: 0,
  status: 'PENDING',
  collectorNote: null,
  reviewNote: null,
  reviewedByMembershipId: null,
  reviewedAt: null,
  submittedAt: new Date('2026-10-01T22:00:00Z'),
  createdAt: new Date('2026-10-01T22:00:00Z'),
});

function setup(found: DailySettlement | null) {
  const findById = vi.fn(() => Promise.resolve(found));
  const settlements: DailySettlementRepository = {
    findById,
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    upsert: vi.fn(() => Promise.reject(new Error('no usado'))),
    review: vi.fn(() => Promise.reject(new Error('no usado'))),
    findByCollectorAndDate: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve()),
  };
  return { useCase: new GetSettlementUseCase(settlements), findById };
}

describe('GetSettlementUseCase', () => {
  it('devuelve el cuadre del prestamista de la sesión', async () => {
    const { useCase, findById } = setup(SETTLEMENT);

    const details = await useCase.execute('settlement-1', 'lender-1');

    expect(findById).toHaveBeenCalledExactlyOnceWith(
      'settlement-1',
      'lender-1',
    );
    expect(details.id).toBe('settlement-1');
  });

  it('rechaza si el cuadre no existe, o es de otro prestamista', async () => {
    const { useCase } = setup(null);

    await expect(
      useCase.execute('settlement-1', 'lender-1'),
    ).rejects.toBeInstanceOf(SettlementNotFoundError);
  });
});
