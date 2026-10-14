import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Los roles de la membresía, o la cartera que exigen, no son válidos. Lleva un `issue` por cada
 * campo que no cumple la regla, con la misma forma que `VALIDATION_FAILED`.
 */
export class InvalidMembershipDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos de la membresía no son válidos.', { issues });
  }
}
