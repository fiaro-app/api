import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El negocio ya tiene todos los préstamos activos que permite su plan. */
export class ActiveLoanLimitReachedError extends DomainError {
  readonly code = 'PLAN_LIMIT_REACHED';
  readonly errorCode = 'L004A';
  readonly kind: DomainErrorKind = 'FORBIDDEN';

  /** @param maxActiveLoans - Cuántos préstamos activos permite el plan. */
  constructor(maxActiveLoans: number) {
    super(
      `El plan permite hasta ${String(maxActiveLoans)} préstamos activos.`,
      { params: { maxActiveLoans } },
    );
  }
}
