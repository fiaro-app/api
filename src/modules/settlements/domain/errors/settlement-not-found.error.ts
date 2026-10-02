import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El cuadre no existe, o es de otro prestamista (PRODUCT.md §6: indistinguible por diseño). */
export class SettlementNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor() {
    super('El cuadre no existe para este prestamista.');
  }
}
