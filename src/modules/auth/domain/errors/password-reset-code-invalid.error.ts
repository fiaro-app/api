import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El código para recuperar la contraseña no es correcto, ya se usó, no hay uno pendiente para ese
 * celular, o se agotaron los intentos para canjearlo.
 */
export class PasswordResetCodeInvalidError extends DomainError {
  readonly code = 'PASSWORD_RESET_CODE_INVALID';
  readonly errorCode = 'A009A';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super('El código para recuperar la contraseña no es correcto.');
  }
}
