import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Los datos de la cartera (por ahora, solo el nombre) no son válidos. Lleva un `issue` por cada
 * campo que no cumple el contrato, con la misma forma que `VALIDATION_FAILED`.
 */
export class InvalidPortfolioDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos de la cartera no son válidos.', { issues });
  }
}
