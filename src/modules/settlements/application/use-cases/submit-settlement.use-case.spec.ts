import { describe, expect, it, vi } from 'vitest';
import { SubmitSettlementUseCase } from '@/modules/settlements/application/use-cases/submit-settlement.use-case.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import { SettlementNoteRequiredError } from '@/modules/settlements/domain/errors/settlement-note-required.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-01T22:00:00Z');

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
  };
  const ids: IdGenerator = { next: () => 'settlement-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new SubmitSettlementUseCase(settlements, ids, clock),
    upsert,
  };
}

describe('SubmitSettlementUseCase', () => {
  it('cierra el día con lo cobrado igual a lo esperado, sin nota', async () => {
    const { useCase, upsert } = setup();

    const details = await useCase.execute({
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
  });

  it('con diferencia y una nota, la acepta y suma collectedAmount de los tres medios', async () => {
    const { useCase, upsert } = setup();

    await useCase.execute({
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

  it('con diferencia y sin nota, rechaza sin guardar nada', async () => {
    const { useCase, upsert } = setup();

    await expect(
      useCase.execute({
        collectorMembershipId: 'membership-1',
        expectedAmount: 100_000,
        collectedCash: 60_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        collectorNote: null,
      }),
    ).rejects.toBeInstanceOf(SettlementNoteRequiredError);
    expect(upsert).not.toHaveBeenCalled();
  });
});
