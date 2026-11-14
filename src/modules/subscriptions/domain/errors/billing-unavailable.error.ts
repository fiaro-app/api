import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cobro con Wompi no está configurado en este entorno (faltan sus llaves). La API arranca igual;
 * solo no se puede crear una orden de pago. Se responde 503.
 */
export class BillingUnavailableError extends DomainError {
  readonly code = 'BILLING_UNAVAILABLE';
  readonly errorCode = 'U002A';
  readonly kind: DomainErrorKind = 'UNAVAILABLE';

  constructor() {
    super('El cobro de la suscripción no está configurado.');
  }
}
