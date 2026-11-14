import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * La cédula no es de un cliente del negocio y la solicitud no trae los datos para registrarlo.
 * Lleva un `issue` por el campo `client`, con la misma forma que `VALIDATION_FAILED`.
 */
export class LoanRequestClientDataRequiredError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly errorCode = 'Q003V';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor() {
    super(
      'Esa cédula no es de un cliente del negocio: faltan los datos del cliente.',
      {
        issues: [
          {
            path: ['client'],
            message:
              'Los datos del cliente son obligatorios si la cédula no existe.',
            params: {},
          },
        ],
      },
    );
  }
}
