import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El desafío de Cloudflare Turnstile no fue completado o su token no es válido. */
export class TurnstileVerificationError extends DomainError {
  readonly code = 'TURNSTILE_FAILED';
  readonly errorCode = 'P002F';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super('La verificación de Cloudflare Turnstile falló.');
  }
}
