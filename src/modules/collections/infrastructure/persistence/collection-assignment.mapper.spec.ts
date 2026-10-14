import { describe, expect, it } from 'vitest';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import {
  toCollectionAssignment,
  toCollectionAssignmentCreateInput,
} from '@/modules/collections/infrastructure/persistence/collection-assignment.mapper.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

describe('toCollectionAssignmentCreateInput', () => {
  it('convierte la asignación en la fila de collection_assignments', () => {
    const assignment = CollectionAssignment.create({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      createdAt: CREATED_AT,
    });

    expect(toCollectionAssignmentCreateInput(assignment)).toEqual({
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      createdAt: CREATED_AT,
    });
  });
});

describe('toCollectionAssignment', () => {
  it('convierte la fila de collection_assignments en la entidad de dominio', () => {
    const row = {
      id: 'assignment-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      effectiveFrom: '2026-10-01',
      effectiveTo: '2026-10-31',
      createdAt: CREATED_AT,
    };

    const found = toCollectionAssignment(row);

    expect(found.id).toBe('assignment-1');
    expect(found.loanId).toBe('loan-1');
    expect(found.collectorMembershipId).toBe('membership-1');
    expect(found.effectiveFrom).toBe('2026-10-01');
    expect(found.effectiveTo).toBe('2026-10-31');
    expect(found.createdAt).toBe(CREATED_AT);
  });
});
