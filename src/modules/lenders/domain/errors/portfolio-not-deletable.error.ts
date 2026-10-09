import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * La cartera no se puede borrar: es la cartera por defecto ("General"), que nace con el
 * prestamista y es donde cae todo si nadie crea otra, o todavía tiene cobradores activos
 * asignados y borrarla los dejaría sin cartera. Código genérico `CONFLICT`, igual que
 * `PortfolioNameTakenError`: el estado actual impide la operación y se resuelve quitando lo que
 * la bloquea.
 */
export class PortfolioNotDeletableError extends DomainError {
  readonly code = 'CONFLICT';
  readonly kind: DomainErrorKind = 'CONFLICT';

  /** @param reason - Por qué no se puede borrar, para el log. */
  constructor(reason: string) {
    super(`La cartera no se puede borrar: ${reason}`);
  }
}
