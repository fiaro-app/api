import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * La contraseña que se dio como confirmación no es la de la cuenta. Usa el código de
 * better-auth (`INVALID_PASSWORD`), que ya tiene su texto: es el mismo fallo, fuera de una ruta
 * de better-auth.
 */
export class WrongPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super('La contraseña no es correcta.');
  }
}
