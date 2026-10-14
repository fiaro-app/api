import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cobrador ya tuvo asignaciones, visitas o cuadres: borrarlo rompería ese historial, así que
 * solo se puede dar de baja.
 */
export class CollectorHasHistoryError extends DomainError {
  readonly code = 'COLLECTOR_HAS_HISTORY';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('El cobrador tiene historial: dalo de baja en lugar de borrarlo.');
  }
}
