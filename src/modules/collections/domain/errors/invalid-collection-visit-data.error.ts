import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El resultado de la visita y lo que trae el pedido no combinan (`PAID` sin pago, un pago sin
 * `PAID`, o `RESCHEDULED` sin `promisedDate`). Lleva un `issue` por cada campo que falla, con la
 * misma forma que `VALIDATION_FAILED`.
 */
export class InvalidCollectionVisitDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'V006V';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    super('Los datos de la visita no son válidos.', { issues });
  }
}
