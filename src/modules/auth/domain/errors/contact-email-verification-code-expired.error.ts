import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El código para verificar el correo de contacto venció: hay que pedir uno nuevo. */
export class ContactEmailVerificationCodeExpiredError extends DomainError {
  readonly code = 'CONTACT_EMAIL_VERIFICATION_CODE_EXPIRED';
  readonly errorCode = 'A003A';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super('El código para verificar el correo venció.');
  }
}
