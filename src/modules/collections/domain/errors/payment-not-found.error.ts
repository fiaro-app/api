import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El pago no existe, o es de otro prestamista: `PaymentRepository.findById` ya filtra por
 * `lenderId` (a través del préstamo), así que las dos causas son indistinguibles (mismo criterio
 * que `LoanNotFoundError`, D-76).
 */
export class PaymentNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  /** @param id - El pago que no se encontró. */
  constructor(id: string) {
    super(`El pago ${id} no existe para este prestamista.`);
  }
}
