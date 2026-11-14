import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El plan del negocio ya tiene todos sus cupos de administradores ocupados. */
export class AdminLimitReachedError extends DomainError {
  readonly code = 'PLAN_LIMIT_REACHED';
  readonly errorCode = 'M007A';
  readonly kind: DomainErrorKind = 'FORBIDDEN';

  /** @param maxAdmins - Cuántos administradores activos permite el plan, la dueña incluida. */
  constructor(maxAdmins: number) {
    super(`El plan permite hasta ${String(maxAdmins)} administradores.`, {
      params: { maxAdmins },
    });
  }
}
