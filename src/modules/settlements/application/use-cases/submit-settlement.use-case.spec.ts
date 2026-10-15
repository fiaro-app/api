import { describe, expect, it, vi } from 'vitest';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { SubmitSettlementUseCase } from '@/modules/settlements/application/use-cases/submit-settlement.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import { SettlementNoteRequiredError } from '@/modules/settlements/domain/errors/settlement-note-required.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-01T22:00:00Z');

const OWNER: MembershipDetails = {
  id: 'membership-owner',
  userId: 'user-owner',
  lenderId: 'lender-1',
  roles: ['OWNER'],
  status: 'ACTIVE',
  portfolioId: null,
  createdAt: NOW,
  deactivatedAt: null,
};

function setup() {
  const upsert = vi.fn((input: { id: string }) =>
    Promise.resolve(
      DailySettlement.create({
        id: input.id,
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
        submittedAt: NOW,
        createdAt: NOW,
      }),
    ),
  );
  const settlements: DailySettlementRepository = {
    findById: vi.fn(() => Promise.resolve(null)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    upsert,
    review: vi.fn(() => Promise.reject(new Error('no usado'))),
    findByCollectorAndDate: vi.fn(() => Promise.resolve(null)),
    delete: vi.fn(() => Promise.resolve()),
  };
  const listReviewersExecute = vi.fn(() => Promise.resolve([OWNER]));
  const listReviewers = {
    execute: listReviewersExecute,
  } as unknown as ListActiveMembershipsByRolesUseCase;
  const createNotificationExecute = vi.fn(() => Promise.resolve({} as never));
  const createNotification = {
    execute: createNotificationExecute,
  } as unknown as CreateNotificationUseCase;
  const ids: IdGenerator = { next: () => 'settlement-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new SubmitSettlementUseCase(
      settlements,
      listReviewers,
      createNotification,
      ids,
      clock,
    ),
    upsert,
    listReviewersExecute,
    createNotificationExecute,
  };
}

describe('SubmitSettlementUseCase', () => {
  it('cierra el día con lo cobrado igual a lo esperado, sin nota, y avisa a los OWNER/LENDER', async () => {
    const { useCase, upsert, listReviewersExecute, createNotificationExecute } =
      setup();

    const details = await useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-1',
      expectedAmount: 100_000,
      collectedCash: 100_000,
      collectedNequi: 0,
      collectedTransfer: 0,
      collectorNote: null,
    });

    expect(upsert).toHaveBeenCalledExactlyOnceWith({
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 100_000,
      collectedCash: 100_000,
      collectedNequi: 0,
      collectedTransfer: 0,
      collectorNote: null,
      submittedAt: NOW,
    });
    expect(details.id).toBe('settlement-1');
    expect(listReviewersExecute).toHaveBeenCalledExactlyOnceWith('lender-1', [
      'OWNER',
      'LENDER',
    ]);
    expect(createNotificationExecute).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-owner',
      lenderId: 'lender-1',
      severity: 'INFO',
      title: 'Cuadre por revisar',
      body: 'Un cobrador cerró su día y espera tu revisión.',
      relatedEntityType: 'DAILY_SETTLEMENT',
      relatedEntityId: 'settlement-1',
    });
  });

  it('con diferencia y una nota, la acepta y suma collectedAmount de los tres medios', async () => {
    const { useCase, upsert } = setup();

    await useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-1',
      expectedAmount: 100_000,
      collectedCash: 60_000,
      collectedNequi: 30_000,
      collectedTransfer: 0,
      collectorNote: 'Un cliente no pagó.',
    });

    expect(upsert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        collectedAmount: 90_000,
        collectorNote: 'Un cliente no pagó.',
      }),
    );
  });

  it('con diferencia y sin nota, rechaza sin guardar nada ni avisar a nadie', async () => {
    const { useCase, upsert, createNotificationExecute } = setup();

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-1',
        expectedAmount: 100_000,
        collectedCash: 60_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        collectorNote: null,
      }),
    ).rejects.toBeInstanceOf(SettlementNoteRequiredError);
    expect(upsert).not.toHaveBeenCalled();
    expect(createNotificationExecute).not.toHaveBeenCalled();
  });
});
