import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La notificación no existe, o no es de quien la pide. */
export class NotificationNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly errorCode = 'N001A';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor() {
    super('La notificación no existe para esta persona.');
  }
}
