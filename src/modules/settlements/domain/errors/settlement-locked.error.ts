import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cuadre de ese día ya se envió y sigue en revisión (`PENDING`) o ya se aprobó: no se puede
 * reenviar ni se pueden registrar más cobros ese día. Solo un cuadre `REJECTED`, o uno cancelado
 * por el cobrador mientras está `PENDING`, deja volver a cobrar y a enviarlo.
 */
export class SettlementLockedError extends DomainError {
  readonly code = 'CONFLICT';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super(
      'El cuadre del día ya fue enviado: cancélalo (si sigue en revisión) para cambiar tus cobros.',
    );
  }
}
