import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cobrador tiene asignaciones que empiezan después de hoy. Darlo de baja con ellas dejaría
 * préstamos a medias: no hay una ruta para quitarlas, así que hay que esperar a que empiecen y
 * entonces se reasignan con el resto. Código genérico `CONFLICT`.
 */
export class CollectorHasScheduledAssignmentsError extends DomainError {
  readonly code = 'CONFLICT';
  readonly errorCode = 'V001A';
  readonly kind: DomainErrorKind = 'CONFLICT';

  constructor() {
    super('El cobrador tiene asignaciones programadas para después de hoy.');
  }
}
