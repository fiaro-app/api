import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cuadre ya se revisó (`APPROVED` o `REJECTED`): aprobar o rechazar solo tiene sentido mientras
 * sigue `PENDING`. Si el cobrador necesita que se vuelva a mirar, reenvía el cuadre (D-36), lo que
 * lo devuelve a `PENDING` para un ciclo de revisión nuevo.
 */
export class SettlementNotPendingError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'S004A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('El cuadre ya fue revisado, así que no se puede revisar otra vez.');
  }
}
