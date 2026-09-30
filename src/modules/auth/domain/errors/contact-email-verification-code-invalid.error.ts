import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El código para verificar el correo de contacto no es correcto, ya se usó, no hay uno pendiente,
 * o se agotaron los intentos para canjearlo.
 */
export class ContactEmailVerificationCodeInvalidError extends DomainError {
  readonly code = 'CONTACT_EMAIL_VERIFICATION_CODE_INVALID';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super('El código para verificar el correo no es correcto.');
  }
}
