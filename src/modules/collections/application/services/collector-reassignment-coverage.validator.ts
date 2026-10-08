import type { CollectorReassignmentInput } from '@/modules/collections/application/dtos/deactivate-collector.dto.js';
import type { DomainIssue } from '@/shared/domain/errors/domain-error.js';

/**
 * Revisa que las reasignaciones de la baja de un cobrador cubran exactamente sus préstamos
 * activos: ninguno repetido, ninguno de sobra, ninguno de menos.
 *
 * @param reassignments - Las reasignaciones que pidió quien administra.
 * @param activeLoanIds - Los préstamos activos que el cobrador tiene asignados hoy.
 * @returns Un issue por cada problema de cobertura; vacío si cubren justo lo esperado.
 */
export function collectLoanCoverageIssues(
  reassignments: readonly CollectorReassignmentInput[],
  activeLoanIds: ReadonlySet<string>,
): DomainIssue[] {
  const issues: DomainIssue[] = [];
  const seen = new Set<string>();
  reassignments.forEach((reassignment, index) => {
    const path = ['reassignments', String(index), 'loanId'];
    if (seen.has(reassignment.loanId)) {
      issues.push({
        path,
        message: 'El préstamo aparece más de una vez.',
        params: {},
      });
    }
    seen.add(reassignment.loanId);
    if (!activeLoanIds.has(reassignment.loanId)) {
      issues.push({
        path,
        message: 'No es un préstamo activo asignado a este cobrador.',
        params: {},
      });
    }
  });
  for (const loanId of activeLoanIds) {
    if (!seen.has(loanId)) {
      issues.push({
        path: ['reassignments'],
        message: `Falta el cobrador nuevo del préstamo ${loanId}.`,
        params: {},
      });
    }
  }
  return issues;
}
