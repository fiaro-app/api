import { describe, expect, it } from 'vitest';
import { toSettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.mapper.js';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';

describe('toSettlementDetails', () => {
  it('convierte la entidad en los datos públicos del cuadre', () => {
    const submittedAt = new Date('2026-10-01T22:00:00Z');
    const createdAt = new Date('2026-10-01T20:00:00Z');
    const settlement = DailySettlement.create({
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 90_000,
      collectedCash: 60_000,
      collectedNequi: 30_000,
      collectedTransfer: 0,
      status: 'PENDING',
      collectorNote: 'Un cliente no pagó.',
      reviewNote: null,
      reviewedByMembershipId: null,
      reviewedAt: null,
      submittedAt,
      createdAt,
    });

    expect(toSettlementDetails(settlement)).toEqual({
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 90_000,
      collectedCash: 60_000,
      collectedNequi: 30_000,
      collectedTransfer: 0,
      status: 'PENDING',
      collectorNote: 'Un cliente no pagó.',
      reviewNote: null,
      reviewedByMembershipId: null,
      reviewedAt: null,
      submittedAt,
      createdAt,
    });
  });
});
