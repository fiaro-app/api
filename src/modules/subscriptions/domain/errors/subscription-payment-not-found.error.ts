import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La orden de pago no existe, o es de otro negocio (indistinguible a propósito). */
export class SubscriptionPaymentNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly errorCode = 'U003A';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(reference: string) {
    super(`La orden de pago ${reference} no existe.`);
  }
}
