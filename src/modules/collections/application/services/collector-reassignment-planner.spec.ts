import { describe, expect, it, vi } from 'vitest';
import { planCollectorReassignment } from '@/modules/collections/application/services/collector-reassignment-planner.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const CREATED_AT = new Date('2026-10-01T00:00:00Z');
const NOW = new Date('2026-10-07T13:00:00Z');
const TODAY = '2026-10-07';

function idGeneratorReturning(...ids: readonly string[]): IdGenerator {
  const next = vi.fn<() => string>();
  ids.forEach((id) => {
    next.mockReturnValueOnce(id);
  });
  return { next };
}

describe('planCollectorReassignment', () => {
  it('cierra en hoy - 1 y abre una nueva desde hoy cuando hay cobrador nuevo', () => {
    const open = [
      CollectionAssignment.create({
        id: 'assignment-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
    ];

    const plan = planCollectorReassignment(
      open,
      [{ loanId: 'loan-1', collectorMembershipId: 'membership-2' }],
      TODAY,
      idGeneratorReturning('assignment-2'),
      NOW,
    );

    expect(plan.closed).toEqual([
      expect.objectContaining({
        id: 'assignment-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: '2026-10-06',
      }),
    ]);
    expect(plan.opened).toEqual([
      expect.objectContaining({
        id: 'assignment-2',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-2',
        effectiveFrom: TODAY,
        effectiveTo: null,
        createdAt: NOW,
      }),
    ]);
  });

  it('cierra hoy mismo una asignación que también empezó hoy', () => {
    const open = [
      CollectionAssignment.create({
        id: 'assignment-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: TODAY,
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
    ];

    const plan = planCollectorReassignment(
      open,
      [{ loanId: 'loan-1', collectorMembershipId: 'membership-2' }],
      TODAY,
      idGeneratorReturning('assignment-2'),
      NOW,
    );

    expect(plan.closed[0]?.effectiveTo).toBe(TODAY);
  });

  it('cierra sin abrir una nueva cuando el préstamo no tiene cobrador nuevo', () => {
    const open = [
      CollectionAssignment.create({
        id: 'assignment-1',
        loanId: 'loan-saldado',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
    ];

    const plan = planCollectorReassignment(
      open,
      [],
      TODAY,
      idGeneratorReturning(),
      NOW,
    );

    expect(plan.closed).toHaveLength(1);
    expect(plan.opened).toEqual([]);
  });

  it('genera un id distinto por cada asignación nueva', () => {
    const open = [
      CollectionAssignment.create({
        id: 'assignment-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
      CollectionAssignment.create({
        id: 'assignment-2',
        loanId: 'loan-2',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: null,
        createdAt: CREATED_AT,
      }),
    ];

    const plan = planCollectorReassignment(
      open,
      [
        { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
        { loanId: 'loan-2', collectorMembershipId: 'membership-3' },
      ],
      TODAY,
      idGeneratorReturning('assignment-3', 'assignment-4'),
      NOW,
    );

    expect(plan.opened.map((assignment) => assignment.id)).toEqual([
      'assignment-3',
      'assignment-4',
    ]);
  });
});
