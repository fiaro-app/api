import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El plan del negocio ya tiene todos sus cupos de cobradores activos ocupados. */
export class CollectorLimitReachedError extends DomainError {
  readonly code = 'PLAN_LIMIT_REACHED';
  readonly kind: DomainErrorKind = 'FORBIDDEN';

  /** @param maxCollectors - Cuántos cobradores activos permite el plan. */
  constructor(maxCollectors: number) {
    super(
      `El plan permite hasta ${String(maxCollectors)} cobradores activos.`,
      {
        params: { maxCollectors },
      },
    );
  }
}
