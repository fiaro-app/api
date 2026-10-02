import { describe, expect, it, vi } from 'vitest';
import { ReviewSettlementUseCase } from '@/modules/settlements/application/use-cases/review-settlement.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import type { SettlementStatus } from '@/modules/settlements/domain/entities/settlement-status.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import { SettlementNotPendingError } from '@/modules/settlements/domain/errors/settlement-not-pending.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const SUBMITTED_AT = new Date('2026-10-01T22:00:00Z');
const REVIEWED_AT = new Date('2026-10-01T23:00:00Z');

function settlement(status: SettlementStatus): DailySettlement {
  return DailySettlement.create({
    id: 'settlement-1',
    collectorMembershipId: 'membership-1',
    date: '2026-10-01',
    expectedAmount: 100_000,
    collectedAmount: 100_000,
    collectedCash: 100_000,
    collectedNequi: 0,
    collectedTransfer: 0,
    status,
    collectorNote: null,
    reviewNote: null,
    reviewedByMembershipId: null,
    reviewedAt: null,
    submittedAt: SUBMITTED_AT,
    createdAt: SUBMITTED_AT,
  });
}

function setup(current: DailySettlement | null) {
  const review = vi.fn((input: { status: SettlementStatus }) =>
    Promise.resolve(
      DailySettlement.create({
        id: 'settlement-1',
        collectorMembershipId: 'membership-1',
        date: '2026-10-01',
        expectedAmount: 100_000,
        collectedAmount: 100_000,
        collectedCash: 100_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        status: input.status,
        collectorNote: null,
        reviewNote: 'Revisado.',
        reviewedByMembershipId: 'membership-2',
        reviewedAt: REVIEWED_AT,
        submittedAt: SUBMITTED_AT,
        createdAt: SUBMITTED_AT,
      }),
    ),
  );
  const settlements: DailySettlementRepository = {
    findById: vi.fn(() => Promise.resolve(current)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    upsert: vi.fn(() => Promise.reject(new Error('no usado'))),
    review,
  };
  const clock: Clock = { now: () => REVIEWED_AT };
  return { useCase: new ReviewSettlementUseCase(settlements, clock), review };
}

describe('ReviewSettlementUseCase', () => {
  it('aprueba un cuadre PENDING', async () => {
    const { useCase, review } = setup(settlement('PENDING'));

    const details = await useCase.execute({
      lenderId: 'lender-1',
      settlementId: 'settlement-1',
      reviewerMembershipId: 'membership-2',
      status: 'APPROVED',
      reviewNote: null,
    });

    expect(review).toHaveBeenCalledExactlyOnceWith({
      id: 'settlement-1',
      status: 'APPROVED',
      reviewNote: null,
      reviewedByMembershipId: 'membership-2',
      reviewedAt: REVIEWED_AT,
    });
    expect(details.status).toBe('APPROVED');
  });

  it('rechaza un cuadre PENDING con un comentario', async () => {
    const { useCase, review } = setup(settlement('PENDING'));

    await useCase.execute({
      lenderId: 'lender-1',
      settlementId: 'settlement-1',
      reviewerMembershipId: 'membership-2',
      status: 'REJECTED',
      reviewNote: 'Falta soportar la diferencia.',
    });

    expect(review).toHaveBeenCalledExactlyOnceWith({
      id: 'settlement-1',
      status: 'REJECTED',
      reviewNote: 'Falta soportar la diferencia.',
      reviewedByMembershipId: 'membership-2',
      reviewedAt: REVIEWED_AT,
    });
  });

  it('rechaza si el cuadre no existe, o es de otro prestamista', async () => {
    const { useCase, review } = setup(null);

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        settlementId: 'settlement-1',
        reviewerMembershipId: 'membership-2',
        status: 'APPROVED',
        reviewNote: null,
      }),
    ).rejects.toBeInstanceOf(SettlementNotFoundError);
    expect(review).not.toHaveBeenCalled();
  });

  it.each(['APPROVED', 'REJECTED'] as const)(
    'rechaza si el cuadre ya estaba %s',
    async (status) => {
      const { useCase, review } = setup(settlement(status));

      await expect(
        useCase.execute({
          lenderId: 'lender-1',
          settlementId: 'settlement-1',
          reviewerMembershipId: 'membership-2',
          status: 'APPROVED',
          reviewNote: null,
        }),
      ).rejects.toBeInstanceOf(SettlementNotPendingError);
      expect(review).not.toHaveBeenCalled();
    },
  );
});
