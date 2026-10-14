import { describe, expect, it } from 'vitest';
import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import { toDailySettlement } from '@/modules/settlements/infrastructure/persistence/daily-settlement.mapper.js';

const SUBMITTED_AT = new Date('2026-10-01T22:00:00Z');
const CREATED_AT = new Date('2026-10-01T20:00:00Z');

describe('toDailySettlement', () => {
  it('convierte la fila en la entidad de dominio', () => {
    const row = {
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 90_000,
      collectedCash: 60_000,
      collectedNequi: 30_000,
      collectedTransfer: 0,
      status: 'PENDING' as const,
      collectorNote: 'Un cliente no pagó.',
      reviewNote: null,
      reviewedByMembershipId: null,
      reviewedAt: null,
      submittedAt: SUBMITTED_AT,
      createdAt: CREATED_AT,
    };

    expect(toDailySettlement(row)).toEqual(
      DailySettlement.create({
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
        submittedAt: SUBMITTED_AT,
        createdAt: CREATED_AT,
      }),
    );
  });

  it('convierte una fila ya revisada', () => {
    const reviewedAt = new Date('2026-10-01T23:00:00Z');
    const row = {
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 100_000,
      collectedCash: 100_000,
      collectedNequi: 0,
      collectedTransfer: 0,
      status: 'APPROVED' as const,
      collectorNote: null,
      reviewNote: 'Todo cuadra.',
      reviewedByMembershipId: 'membership-2',
      reviewedAt,
      submittedAt: SUBMITTED_AT,
      createdAt: CREATED_AT,
    };

    expect(toDailySettlement(row)).toEqual(
      DailySettlement.create({
        id: 'settlement-1',
        collectorMembershipId: 'membership-1',
        date: '2026-10-01',
        expectedAmount: 100_000,
        collectedAmount: 100_000,
        collectedCash: 100_000,
        collectedNequi: 0,
        collectedTransfer: 0,
        status: 'APPROVED',
        collectorNote: null,
        reviewNote: 'Todo cuadra.',
        reviewedByMembershipId: 'membership-2',
        reviewedAt,
        submittedAt: SUBMITTED_AT,
        createdAt: CREATED_AT,
      }),
    );
  });
});
