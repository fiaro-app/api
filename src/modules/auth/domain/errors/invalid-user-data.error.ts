import { DomainError } from '@/shared/domain/errors/domain-error.js';

/** Un campo de la persona no cumple su contrato: `path` y `message` como en `VALIDATION_FAILED`. */
export interface UserDataIssue {
  /** Ruta hasta el campo que falla, por ejemplo `['email']`. */
  readonly path: readonly (string | number)[];
  /** Qué regla incumple el campo. */
  readonly message: string;
}

/** Los datos de la persona (nombre, cédula o email) no son válidos. */
export class InvalidUserDataError extends DomainError {
  readonly code = 'VALIDATION_FAILED';

  constructor(readonly issues: readonly UserDataIssue[]) {
    super('Los datos de la persona no son válidos.');
  }
}
