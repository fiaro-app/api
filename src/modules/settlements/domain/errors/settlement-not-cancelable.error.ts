import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** Solo se puede cancelar un cuadre que sigue en revisión (`PENDING`): uno ya revisado no se toca. */
export class SettlementNotCancelableError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'S002A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('El cuadre ya fue revisado, así que no se puede cancelar.');
  }
}
