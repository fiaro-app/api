import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * La membresía no existe para el prestamista de la sesión. Mismo código genérico `NOT_FOUND` que
 * cualquier recurso ausente: no hace falta uno propio (`MembershipRepository.findById` ya no
 * distingue "de otro prestamista" de "no existe", así que esto nunca revela membresías ajenas).
 */
export class MembershipNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(id: string) {
    super(`La membresía ${id} no existe.`);
  }
}
