import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La cartera no existe, o es de otro prestamista: se responde igual, para no revelar ajenas. */
export class PortfolioNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly errorCode = 'B006A';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(id: string) {
    super(`La cartera ${id} no existe.`);
  }
}
