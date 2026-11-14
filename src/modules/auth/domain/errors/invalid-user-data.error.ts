import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Los datos de la persona (nombre, cédula o email) no son válidos. Lleva un `issue` por cada
 * campo que no cumple el contrato, con la misma forma que `VALIDATION_FAILED`.
 */
export class InvalidUserDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'A007V';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos de la persona no son válidos.', { issues });
  }
}
