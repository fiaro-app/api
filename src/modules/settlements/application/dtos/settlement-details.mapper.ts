import type { SettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import type { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';

/** @param settlement - El cuadre. */
export function toSettlementDetails(
  settlement: DailySettlement,
): SettlementDetails {
  return {
    id: settlement.id,
    collectorMembershipId: settlement.collectorMembershipId,
    date: settlement.date,
    expectedAmount: settlement.expectedAmount,
    collectedAmount: settlement.collectedAmount,
    collectedCash: settlement.collectedCash,
    collectedNequi: settlement.collectedNequi,
    collectedTransfer: settlement.collectedTransfer,
    status: settlement.status,
    collectorNote: settlement.collectorNote,
    reviewNote: settlement.reviewNote,
    reviewedByMembershipId: settlement.reviewedByMembershipId,
    reviewedAt: settlement.reviewedAt,
    submittedAt: settlement.submittedAt,
    createdAt: settlement.createdAt,
  };
}
