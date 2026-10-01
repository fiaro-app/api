import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Esa persona ya tiene una membresía con este prestamista (`@@unique([userId, lenderId])`). Usa
 * el código genérico `CONFLICT`, no uno propio: igual que un nombre de cartera repetido (D-80),
 * no hay un significado de negocio que una app necesite distinguir — ya le mostraste a esa
 * persona en la lista, invitarla de nuevo no tiene otro sentido que avisar que ya está.
 */
export class MembershipAlreadyExistsError extends DomainError {
  readonly code = 'CONFLICT';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Esa persona ya tiene una membresía con este prestamista.');
  }
}
