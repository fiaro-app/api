import { describe, expect, it } from 'vitest';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

const AT = new Date('2026-10-05T15:00:00Z');

const record = (id: string, loanId: string): CollectionVisitRecord => ({
  visit: CollectionVisit.create({
    id,
    loanId,
    collectorMembershipId: 'membership-1',
    outcome: 'NOT_FOUND',
    expectedAmount: 10_000,
    promisedDate: null,
    occurredAt: AT,
    createdAt: AT,
  }),
  payment: null,
  reversal: null,
});

describe('groupRecordsByLoan', () => {
  it('agrupa las visitas por préstamo conservando el orden en que llegan', () => {
    const grouped = groupRecordsByLoan([
      record('v1', 'loan-1'),
      record('v2', 'loan-2'),
      record('v3', 'loan-1'),
    ]);

    expect(grouped.get('loan-1')?.map((r) => r.visit.id)).toEqual(['v1', 'v3']);
    expect(grouped.get('loan-2')?.map((r) => r.visit.id)).toEqual(['v2']);
  });

  it('un préstamo sin visitas no aparece, y sin visitas el mapa queda vacío', () => {
    expect(groupRecordsByLoan([]).size).toBe(0);
    expect(groupRecordsByLoan([record('v1', 'loan-1')]).has('loan-2')).toBe(
      false,
    );
  });
});
