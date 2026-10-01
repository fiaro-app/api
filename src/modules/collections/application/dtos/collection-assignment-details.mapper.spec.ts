import { describe, expect, it } from 'vitest';
import { toCollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.mapper.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';

describe('toCollectionAssignmentDetails', () => {
  it('devuelve los datos públicos de la asignación', () => {
    const createdAt = new Date('2026-09-30T00:00:00Z');
    const assignment = CollectionAssignment.create({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      createdAt,
    });

    expect(toCollectionAssignmentDetails(assignment)).toEqual({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      createdAt,
    });
  });
});
