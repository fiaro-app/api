import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** Wompi no aceptó la anulación del pago. */
export class RefundGatewayFailedError extends DomainError {
  readonly code = 'REFUND_GATEWAY_FAILED';
  readonly errorCode = 'U006A';
  readonly kind: DomainErrorKind = 'UNAVAILABLE';

  constructor() {
    super('Wompi no aceptó la anulación del pago.');
  }
}
