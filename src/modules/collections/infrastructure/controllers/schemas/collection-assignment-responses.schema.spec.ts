import { describe, expect, it } from 'vitest';
import type { CollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.dto.js';
import {
  toCollectionAssignmentResponse,
  toCollectionAssignmentsResponse,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-assignment-responses.schema.js';

const DETAILS: CollectionAssignmentDetails = {
  id: 'assignment-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
  createdAt: new Date('2026-09-30T00:00:00Z'),
};

describe('toCollectionAssignmentResponse', () => {
  it('convierte la fecha de creación a texto ISO', () => {
    expect(toCollectionAssignmentResponse(DETAILS)).toEqual({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      createdAt: '2026-09-30T00:00:00.000Z',
    });
  });
});

describe('toCollectionAssignmentsResponse', () => {
  it('convierte cada asignación de la lista', () => {
    expect(toCollectionAssignmentsResponse([DETAILS])).toHaveLength(1);
  });

  it('convierte una lista vacía en una lista vacía', () => {
    expect(toCollectionAssignmentsResponse([])).toEqual([]);
  });
});
