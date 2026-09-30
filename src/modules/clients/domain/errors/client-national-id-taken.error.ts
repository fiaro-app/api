import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Ya existe un cliente con esa cédula para este prestamista (PRODUCT.md §5: `nationalId` es
 * único por Lender, no en todo el sistema).
 */
export class ClientNationalIdTakenError extends DomainError {
  readonly code = 'CLIENT_NATIONAL_ID_TAKEN';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Ya existe un cliente con esa cédula para este prestamista.');
  }
}
