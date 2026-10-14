import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';

/**
 * El cobrador tiene rol `COLLECTOR` en el prestamista, pero no una `CollectionAssignment`
 * vigente para este préstamo en la fecha de la visita (PRODUCT.md §6: "modo cobrador"). Evita que
 * cualquier cobrador del negocio registre visitas sobre préstamos que no le tocan a él.
 */
export class CollectorNotAssignedError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly kind: DomainErrorKind = 'FORBIDDEN';

  constructor() {
    super('La membresía no tiene una asignación vigente para este préstamo.');
  }
}
