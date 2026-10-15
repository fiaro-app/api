import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Ya existe una cartera con ese nombre para este prestamista (`@@unique([lenderId, name])`).
 * Usa el código genérico `CONFLICT`, no uno propio: a diferencia de una cédula repetida
 * (D-76), un nombre de cartera repetido no tiene un significado de negocio especial que una app
 * necesite distinguir — "elige otro nombre" ya lo dice el género.
 */
export class PortfolioNameTakenError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'B004A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Ya existe una cartera con ese nombre para este prestamista.');
  }
}
