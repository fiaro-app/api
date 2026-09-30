import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El correo de contacto ya está verificado. */
export class ContactEmailAlreadyVerifiedError extends DomainError {
  readonly code = 'CONTACT_EMAIL_ALREADY_VERIFIED';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('El correo de contacto ya está verificado.');
  }
}
