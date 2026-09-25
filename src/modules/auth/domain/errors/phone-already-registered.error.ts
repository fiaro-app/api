import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** Ya existe una cuenta con ese celular: es único en todo el sistema (D-27). */
export class PhoneAlreadyRegisteredError extends DomainError {
  readonly code = 'PHONE_ALREADY_REGISTERED';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Ya existe una cuenta con ese celular.');
  }
}
