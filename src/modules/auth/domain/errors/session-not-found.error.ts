import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La sesión no existe, ya venció, o es de otra persona: se responde igual, para no revelar ajenas. */
export class SessionNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly errorCode = 'A011A';
  readonly kind: DomainErrorKind = 'NOT_FOUND';

  constructor(id: string) {
    super(`La sesión ${id} no existe.`);
  }
}
