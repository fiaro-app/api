import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El prestamista ya tiene todas las carteras que permite (la «General» cuenta). */
export class PortfolioLimitReachedError extends DomainError {
  readonly code = 'PLAN_LIMIT_REACHED';
  readonly errorCode = 'B007A';
  readonly kind: DomainErrorKind = 'FORBIDDEN';

  /** @param maxPortfolios - Cuántas carteras permite el negocio. */
  constructor(maxPortfolios: number) {
    super(`El negocio puede tener hasta ${String(maxPortfolios)} carteras.`, {
      params: { maxPortfolios },
    });
  }
}
