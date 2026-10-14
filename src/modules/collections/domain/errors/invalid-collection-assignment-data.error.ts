import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Las fechas de la asignación, o la membresía que se asigna, no cumplen la regla. Lleva un
 * `issue` por cada campo que falla, con la misma forma que `VALIDATION_FAILED`.
 */
export class InvalidCollectionAssignmentDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos de la asignación no son válidos.', { issues });
  }
}
