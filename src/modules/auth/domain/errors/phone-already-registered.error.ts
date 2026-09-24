import { DomainError } from '@/shared/domain/errors/domain-error.js';

/** Ya existe una cuenta con ese celular: es único en todo el sistema (D-27). */
export class PhoneAlreadyRegisteredError extends DomainError {
  readonly code = 'PHONE_ALREADY_REGISTERED';

  constructor() {
    super('Ya existe una cuenta con ese celular.');
  }
}
