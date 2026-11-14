import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** No se puede anular con Wompi: solo pagos con tarjeta, con las llaves de anulación configuradas. */
export class RefundMethodUnsupportedError extends DomainError {
  readonly code = 'REFUND_METHOD_UNSUPPORTED';
  readonly errorCode = 'U005A';
  readonly kind: DomainErrorKind = 'RULE_VIOLATED';

  constructor() {
    super(
      'No se puede anular con Wompi: solo pagos con tarjeta, con las llaves de anulación configuradas.',
    );
  }
}
