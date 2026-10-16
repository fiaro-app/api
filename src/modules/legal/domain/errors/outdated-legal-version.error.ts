import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La persona aceptó una versión de los documentos legales que ya no es la vigente: debe leer la nueva y volver a aceptar. */
export class OutdatedLegalVersionError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'P930V';
  readonly kind: DomainErrorKind = 'INVALID';
}
