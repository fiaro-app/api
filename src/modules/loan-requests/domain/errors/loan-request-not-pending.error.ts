import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La solicitud ya fue aceptada o rechazada: no se puede resolver otra vez. */
export class LoanRequestNotPendingError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'Q002A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('La solicitud ya fue resuelta.');
  }
}
