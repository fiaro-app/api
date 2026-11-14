import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El préstamo ya no está `ACTIVE` (ya está `PAID_OFF` o `CANCELED`), así que no se puede
 * cancelar (PRODUCT.md §5: cancelar es "anulación por error de registro, antes de recibir
 * pagos").
 */
export class LoanNotCancelableError extends DomainError {
  readonly code = 'LOAN_NOT_CANCELABLE';
  readonly errorCode = 'L002A';
  readonly kind: DomainErrorKind = 'RULE_VIOLATED';

  constructor() {
    super('El préstamo ya no está ACTIVE, así que no se puede cancelar.');
  }
}
