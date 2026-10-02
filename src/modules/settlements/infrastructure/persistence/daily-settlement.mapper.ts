import { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import type { DailySettlementModel } from '@/shared/infrastructure/persistence/generated/models.js';

/** @param row - Fila de `daily_settlements`. */
export function toDailySettlement(row: DailySettlementModel): DailySettlement {
  return DailySettlement.create({
    id: row.id,
    collectorMembershipId: row.collectorMembershipId,
    date: row.date,
    expectedAmount: row.expectedAmount,
    collectedAmount: row.collectedAmount,
    collectedCash: row.collectedCash,
    collectedNequi: row.collectedNequi,
    collectedTransfer: row.collectedTransfer,
    status: row.status,
    collectorNote: row.collectorNote,
    reviewNote: row.reviewNote,
    reviewedByMembershipId: row.reviewedByMembershipId,
    reviewedAt: row.reviewedAt,
    submittedAt: row.submittedAt,
    createdAt: row.createdAt,
  });
}
