import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { CollectionAssignmentModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';

/** @param assignment - Asignación de cobro. */
export function toCollectionAssignmentCreateInput(
  assignment: CollectionAssignment,
): Prisma.CollectionAssignmentUncheckedCreateInput {
  return {
    id: assignment.id,
    loanId: assignment.loanId,
    collectorMembershipId: assignment.collectorMembershipId,
    effectiveFrom: assignment.effectiveFrom,
    effectiveTo: assignment.effectiveTo,
    createdAt: assignment.createdAt,
  };
}

/** @param row - Fila de `collection_assignments`. */
export function toCollectionAssignment(
  row: CollectionAssignmentModel,
): CollectionAssignment {
  return CollectionAssignment.create({
    id: row.id,
    loanId: row.loanId,
    collectorMembershipId: row.collectorMembershipId,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    createdAt: row.createdAt,
  });
}
