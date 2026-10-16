import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El archivo no es una foto válida de este dueño: no se subió con la URL firmada, no es PNG o JPEG, o pesa de más. */
export class InvalidAttachmentError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'P920V';
  readonly kind: DomainErrorKind = 'INVALID';
}
