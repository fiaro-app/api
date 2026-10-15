import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * La membresía no es de un cobrador: no tiene el rol `COLLECTOR` en el prestamista de la sesión. Se
 * responde como si no existiera, con el código genérico `NOT_FOUND`: quien administra no necesita
 * un error propio para algo que solo pasa cuando se equivoca de id.
 */
export class CollectorNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly errorCode = 'V003A';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(id: string) {
    super(`El cobrador ${id} no existe.`);
  }
}
