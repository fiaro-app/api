import { DomainError } from '@/shared/domain/errors/domain-error.js';

/** La contraseña no cumple la longitud permitida. */
export class InvalidPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD';

  constructor(minLength: number, maxLength: number) {
    super(
      `La contraseña debe tener entre ${String(minLength)} y ${String(maxLength)} caracteres.`,
    );
  }
}
