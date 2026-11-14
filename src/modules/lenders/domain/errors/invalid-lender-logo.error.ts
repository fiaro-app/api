import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/** El logo no es una imagen que esta API haya aceptado subir: se rechaza (`VALIDATION_FAILED` en `logoUrl`). */
export class InvalidLenderLogoError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'B002V';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly {
    path: readonly string[];
    message: string;
  }[];

  constructor(reason: string) {
    super('El logo no es válido.', {
      issues: [{ path: ['logoUrl'], message: reason }],
    });
  }
}
