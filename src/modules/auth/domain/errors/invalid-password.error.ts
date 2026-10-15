import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * La contraseña no cumple la longitud permitida. Su código no es `INVALID_PASSWORD`, que es el de
 * better-auth para una contraseña incorrecta: son fallos distintos.
 */
export class InvalidPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD_LENGTH';
  readonly errorCode = 'A006V';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor(minLength: number, maxLength: number) {
    super(
      `La contraseña debe tener entre ${String(minLength)} y ${String(maxLength)} caracteres.`,
      { params: { minLength, maxLength } },
    );
  }
}
