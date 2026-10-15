import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Los datos del préstamo no son válidos. Lleva un `issue` por cada campo que no cumple el
 * contrato, con la misma forma que `VALIDATION_FAILED`.
 */
export class InvalidLoanDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'L001V';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos del préstamo no son válidos.', { issues });
  }
}
