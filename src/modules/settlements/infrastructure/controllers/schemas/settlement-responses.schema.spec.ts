import { describe, expect, it } from 'vitest';
import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import {
  toSettlementResponse,
  toSettlementsPageResponse,
} from '@/modules/settlements/infrastructure/controllers/schemas/settlement-responses.schema.js';

const DETAILS: SettlementDetails = {
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
  submittedAt: new Date('2026-10-01T22:00:00Z'),
  createdAt: new Date('2026-10-01T20:00:00Z'),
};

describe('toSettlementResponse', () => {
  it('anida collectedByMethod y deja los campos de revisión en null', () => {
    expect(toSettlementResponse(DETAILS)).toEqual({
      id: 'settlement-1',
      collectorMembershipId: 'membership-1',
      date: '2026-10-01',
      expectedAmount: 100_000,
      collectedAmount: 90_000,
      collectedByMethod: { CASH: 60_000, NEQUI: 30_000, TRANSFER: 0 },
      status: 'PENDING',
      collectorNote: 'Un cliente no pagó.',
      reviewNote: null,
      reviewedByMembershipId: null,
      reviewedAt: null,
      submittedAt: '2026-10-01T22:00:00.000Z',
      createdAt: '2026-10-01T20:00:00.000Z',
    });
  });

  it('convierte reviewedAt a texto ISO cuando el cuadre ya se revisó', () => {
    const reviewed: SettlementDetails = {
      ...DETAILS,
      status: 'APPROVED',
      reviewNote: 'Todo cuadra.',
      reviewedByMembershipId: 'membership-2',
      reviewedAt: new Date('2026-10-01T23:00:00Z'),
    };

    expect(toSettlementResponse(reviewed).reviewedAt).toBe(
      '2026-10-01T23:00:00.000Z',
    );
  });
});

describe('toSettlementsPageResponse', () => {
  it('envuelve los cuadres con sus metadatos de paginación', () => {
    expect(
      toSettlementsPageResponse(
        { items: [DETAILS], total: 1 },
        { page: 1, pageSize: 20 },
      ),
    ).toEqual({
      data: [toSettlementResponse(DETAILS)],
      meta: { page: 1, pageSize: 20, total: 1 },
    });
  });
});
