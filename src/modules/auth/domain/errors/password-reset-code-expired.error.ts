import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El código para recuperar la contraseña venció: hay que pedir uno nuevo. */
export class PasswordResetCodeExpiredError extends DomainError {
  readonly code = 'PASSWORD_RESET_CODE_EXPIRED';
  readonly errorCode = 'A008A';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super('El código para recuperar la contraseña venció.');
  }
}
