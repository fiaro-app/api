import { describe, expect, it } from 'vitest';
import { collectLoanCoverageIssues } from '@/modules/collections/application/services/collector-reassignment-coverage.validator.js';

describe('collectLoanCoverageIssues', () => {
  it('no reporta nada si las reasignaciones cubren justo los préstamos activos', () => {
    const issues = collectLoanCoverageIssues(
      [{ loanId: 'loan-1', collectorMembershipId: 'membership-2' }],
      new Set(['loan-1']),
    );

    expect(issues).toEqual([]);
  });

  it('no reporta nada sin préstamos activos ni reasignaciones', () => {
    expect(collectLoanCoverageIssues([], new Set())).toEqual([]);
  });

  it('reporta un préstamo que no está entre los activos del cobrador', () => {
    const issues = collectLoanCoverageIssues(
      [{ loanId: 'loan-ajeno', collectorMembershipId: 'membership-2' }],
      new Set(['loan-1']),
    );

    expect(issues.map((issue) => issue.message)).toEqual([
      'No es un préstamo activo asignado a este cobrador.',
      'Falta el cobrador nuevo del préstamo loan-1.',
    ]);
  });

  it('reporta el préstamo activo que no llegó en ninguna reasignación', () => {
    const issues = collectLoanCoverageIssues([], new Set(['loan-1']));

    expect(issues).toEqual([
      {
        path: ['reassignments'],
        message: 'Falta el cobrador nuevo del préstamo loan-1.',
        params: {},
      },
    ]);
  });

  it('reporta un préstamo repetido una sola vez por repetición, sin marcarlo como no activo', () => {
    const issues = collectLoanCoverageIssues(
      [
        { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
        { loanId: 'loan-1', collectorMembershipId: 'membership-3' },
      ],
      new Set(['loan-1']),
    );

    expect(issues).toEqual([
      {
        path: ['reassignments', '1', 'loanId'],
        message: 'El préstamo aparece más de una vez.',
        params: {},
      },
    ]);
  });
});
