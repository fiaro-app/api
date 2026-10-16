import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La persona de la sesión no puede ver ni cambiar esa foto: un cobrador solo toca los comprobantes de sus propios cobros. */
export class AttachmentForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly errorCode = 'P921A';
  readonly kind: DomainErrorKind = 'FORBIDDEN';

  constructor() {
    super('No tienes permiso sobre esta foto.');
  }
}
