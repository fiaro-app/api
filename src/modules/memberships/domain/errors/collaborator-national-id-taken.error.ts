import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Ya hay un colaborador con esa cédula en este negocio, activo o dado de baja. La regla es por
 * prestamista, no global: la misma persona puede trabajar para otro negocio (D-74).
 */
export class CollaboratorNationalIdTakenError extends DomainError {
  readonly code = 'COLLABORATOR_NATIONAL_ID_TAKEN';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('Ya hay un colaborador con esa cédula en este negocio.', {
      issues: [
        {
          path: ['nationalId'],
          message: 'Ya hay un colaborador con esa cédula en este negocio.',
        },
      ],
    });
  }
}
