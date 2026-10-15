import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Los datos del contacto no son válidos. Lleva un `issue` por cada campo que no cumple, con la
 * misma forma que `VALIDATION_FAILED`.
 */
export class InvalidLeadDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'G001V';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos del contacto no son válidos.', { issues });
  }
}
