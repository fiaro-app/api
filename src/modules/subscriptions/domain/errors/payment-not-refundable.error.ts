import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El pago no se puede reembolsar: solo los aprobados que no se han devuelto. */
export class PaymentNotRefundableError extends DomainError {
  readonly code = 'PAYMENT_NOT_REFUNDABLE';
  readonly errorCode = 'U004A';
  readonly kind: DomainErrorKind = 'RULE_VIOLATED';

  constructor() {
    super(
      'El pago no se puede reembolsar: solo los aprobados que no se han devuelto.',
    );
  }
}
