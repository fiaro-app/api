import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cobrador ya envió el cuadre de ese día y sigue en revisión o ya se aprobó: no puede registrar
 * más cobros ese día (D-130). Si lo envió por error, lo cancela (mientras está en revisión) y sigue.
 */
export class DayAlreadySettledError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'V004A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super(
      'Ya enviaste el cuadre de ese día, así que no puedes registrar más cobros. Cancélalo si sigue en revisión.',
    );
  }
}
