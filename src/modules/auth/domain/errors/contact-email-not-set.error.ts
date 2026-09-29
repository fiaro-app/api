import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** La cuenta no tiene un correo de contacto registrado: no hay nada que verificar. */
export class ContactEmailNotSetError extends DomainError {
  readonly code = 'CONTACT_EMAIL_NOT_SET';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('La cuenta no tiene un correo de contacto registrado.');
  }
}
