import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Se intentó cerrar, por la lista de sesiones, la misma sesión desde la que se pide. Para salir
 * de esta existe `POST /auth/sign-out`, que además limpia la cookie del dispositivo; borrar la
 * fila sin limpiarla dejaría a la app con una cookie muerta. Código genérico `CONFLICT`.
 */
export class CurrentSessionNotRevocableError extends DomainError {
  readonly code = 'CONFLICT';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super(
      'La sesión actual no se cierra desde la lista: usa POST /auth/sign-out.',
    );
  }
}
