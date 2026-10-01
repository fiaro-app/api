import type { CollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.dto.js';
import type { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';

/** @param assignment - La asignación. */
export function toCollectionAssignmentDetails(
  assignment: CollectionAssignment,
): CollectionAssignmentDetails {
  return {
    id: assignment.id,
    loanId: assignment.loanId,
    collectorMembershipId: assignment.collectorMembershipId,
    effectiveFrom: assignment.effectiveFrom,
    effectiveTo: assignment.effectiveTo,
    createdAt: assignment.createdAt,
  };
}
