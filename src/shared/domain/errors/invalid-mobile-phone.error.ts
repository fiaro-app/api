import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El valor no es un celular colombiano en formato E.164. */
export class InvalidMobilePhoneError extends DomainError {
  readonly code = 'INVALID_PHONE';
  readonly kind: DomainErrorKind = 'INVALID';

  constructor() {
    super(
      'El celular debe ser colombiano y estar en formato internacional, por ejemplo +573001234567.',
    );
  }
}
