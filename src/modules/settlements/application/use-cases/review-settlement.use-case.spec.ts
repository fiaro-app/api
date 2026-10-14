import { describe, expect, it, vi } from 'vitest';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { ReviewSettlementUseCase } from '@/modules/settlements/application/use-cases/review-settlement.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import type { SettlementStatus } from '@/modules/settlements/domain/entities/settlement-status.js';
import { SettlementNotFoundError } from '@/modules/settlements/domain/errors/settlement-not-found.error.js';
import { SettlementNotPendingError } from '@/modules/settlements/domain/errors/settlement-not-pending.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const SUBMITTED_AT = new Date('2026-10-01T22:00:00Z');
const REVIEWED_AT = new Date('2026-10-01T23:00:00Z');

const COLLECTOR: MembershipDetails = {
  id: 'membership-1',
  userId: 'user-collector',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: SUBMITTED_AT,
  deactivatedAt: null,
};

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
  const review = vi.fn(
    (input: { status: SettlementStatus; reviewNote: string | null }) =>
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
          reviewNote: input.reviewNote,
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
  const getMembershipExecute = vi.fn(() => Promise.resolve(COLLECTOR));
  const getMembership = {
    execute: getMembershipExecute,
  } as unknown as GetMembershipUseCase;
  const createNotificationExecute = vi.fn(() => Promise.resolve({} as never));
  const createNotification = {
    execute: createNotificationExecute,
  } as unknown as CreateNotificationUseCase;
  const clock: Clock = { now: () => REVIEWED_AT };
  return {
    useCase: new ReviewSettlementUseCase(
      settlements,
      getMembership,
      createNotification,
      clock,
    ),
    review,
    getMembershipExecute,
    createNotificationExecute,
  };
}

describe('ReviewSettlementUseCase', () => {
  it('aprueba un cuadre PENDING sin avisarle a nadie', async () => {
    const { useCase, review, createNotificationExecute } = setup(
      settlement('PENDING'),
    );

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
    expect(createNotificationExecute).not.toHaveBeenCalled();
  });

  it('rechaza un cuadre PENDING con un comentario, y avisa al cobrador con ese texto', async () => {
    const { useCase, review, getMembershipExecute, createNotificationExecute } =
      setup(settlement('PENDING'));

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
    expect(getMembershipExecute).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      'lender-1',
    );
    expect(createNotificationExecute).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-collector',
      lenderId: 'lender-1',
      severity: 'WARNING',
      title: 'Cuadre rechazado',
      body: 'Falta soportar la diferencia.',
      relatedEntityType: 'DAILY_SETTLEMENT',
      relatedEntityId: 'settlement-1',
    });
  });

  it('rechaza sin comentario avisa con un texto genérico que incluye la fecha', async () => {
    const { useCase, createNotificationExecute } = setup(settlement('PENDING'));

    await useCase.execute({
      lenderId: 'lender-1',
      settlementId: 'settlement-1',
      reviewerMembershipId: 'membership-2',
      status: 'REJECTED',
      reviewNote: null,
    });

    expect(createNotificationExecute).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ body: 'Revisa tu cuadre del 2026-10-01.' }),
    );
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
