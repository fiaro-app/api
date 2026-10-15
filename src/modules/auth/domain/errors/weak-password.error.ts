import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Por qué se considera demasiado fácil de adivinar una contraseña: `COMMON` (está entre las más
 * usadas), `PATTERN` (repite o encadena caracteres) o `PERSONAL` (incluye el celular o la cédula
 * de su dueño).
 */
export type PasswordWeakness = 'COMMON' | 'PATTERN' | 'PERSONAL';

/**
 * La contraseña cumple la longitud pero es demasiado fácil de adivinar. Quien la ve solo recibe el
 * `code`; el motivo queda en el mensaje del error, para el log.
 */
export class WeakPasswordError extends DomainError {
  readonly code = 'PASSWORD_TOO_WEAK';
  readonly errorCode = 'A012V';
  readonly kind: DomainErrorKind = 'INVALID';

  /** @param weakness - Por qué se rechaza. */
  constructor(readonly weakness: PasswordWeakness) {
    super(
      `La contraseña es demasiado fácil de adivinar (motivo: ${weakness}).`,
      { params: { weakness } },
    );
  }
}
