import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Ya hay una cuenta con ese correo de contacto: es único en todo el sistema, sin distinguir
 * mayúsculas, porque también sirve para iniciar sesión.
 *
 * @remarks
 * Usa el código genérico `CONFLICT` (no hay uno propio en `contracts`); el `errorCode` del catálogo
 * sí lo distingue. Si algún día una app necesita reaccionar a este caso, se agrega el código a
 * `contracts` y se cambia aquí.
 */
export class ContactEmailAlreadyRegisteredError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'A014A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Ya existe una cuenta con ese correo de contacto.');
  }
}
