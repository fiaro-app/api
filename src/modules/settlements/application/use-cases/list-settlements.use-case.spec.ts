import { describe, expect, it, vi } from 'vitest';
import { ListSettlementsUseCase } from '@/modules/settlements/application/use-cases/list-settlements.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
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

function setup() {
  const list = vi.fn(() => Promise.resolve({ items: [SETTLEMENT], total: 1 }));
  const settlements: DailySettlementRepository = {
    findById: vi.fn(() => Promise.resolve(null)),
    list,
    upsert: vi.fn(() => Promise.reject(new Error('no usado'))),
    review: vi.fn(() => Promise.reject(new Error('no usado'))),
  };
  return { useCase: new ListSettlementsUseCase(settlements), list };
}

describe('ListSettlementsUseCase', () => {
  it('pagina los cuadres del prestamista de la sesión', async () => {
    const { useCase, list } = setup();

    const page = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      status: 'PENDING',
    });

    expect(list).toHaveBeenCalledExactlyOnceWith({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      status: 'PENDING',
    });
    expect(page).toEqual({ items: [SETTLEMENT], total: 1 });
  });
});
