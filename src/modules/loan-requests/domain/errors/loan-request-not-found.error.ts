import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La solicitud no existe para el prestamista de la sesión (o no es del cobrador que la pide). */
export class LoanRequestNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly errorCode = 'Q001A';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(id: string) {
    super(`La solicitud ${id} no existe.`);
  }
}
