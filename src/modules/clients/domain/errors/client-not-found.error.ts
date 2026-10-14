import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cliente no existe para el prestamista de la sesión. Mismo código genérico `NOT_FOUND` que
 * cualquier recurso ausente: no hace falta uno propio (`ClientRepository.findById` ya no
 * distingue "de otro prestamista" de "no existe", así que esto nunca revela clientes ajenos).
 */
export class ClientNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(id: string) {
    super(`El cliente ${id} no existe.`);
  }
}
