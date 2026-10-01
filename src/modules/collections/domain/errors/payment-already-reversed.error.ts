import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Ese pago ya tiene una reversión (`@@unique([paymentId])`). Usa el código genérico `CONFLICT`,
 * no uno propio: mismo criterio que un nombre de cartera repetido (D-80) o una membresía
 * duplicada (D-81) — un pago no se reversa dos veces, y no hay un significado de negocio
 * adicional que una app necesite distinguir del género.
 */
export class PaymentAlreadyReversedError extends DomainError {
  readonly code = 'CONFLICT';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Ese pago ya tiene una reversión.');
  }
}
