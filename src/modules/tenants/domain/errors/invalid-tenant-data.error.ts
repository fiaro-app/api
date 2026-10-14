import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Los datos del Tenant (por ahora, solo el nombre) no son válidos. Lleva un `issue` por cada
 * campo que no cumple el contrato, con la misma forma que `VALIDATION_FAILED`.
 */
export class InvalidTenantDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos del negocio no son válidos.', { issues });
  }
}
