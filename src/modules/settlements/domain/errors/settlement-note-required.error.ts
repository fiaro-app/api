import {
  DomainError,
  type DomainErrorKind,
  type DomainIssue,
} from '@/shared/domain/errors/domain-error.js';

/**
 * Falta `collectorNote` cuando `collectedAmount` difiere de `expectedAmount` (PRODUCT.md §5,
 * D-19: "nota obligatoria si hay diferencia"). Mismo `code` que una falla del pipe global, con un
 * solo `issue` en el campo que falta, para que la respuesta tenga la misma forma.
 */
export class SettlementNoteRequiredError extends DomainError {
  readonly code = 'VALIDATION_FAILED';
  readonly kind: DomainErrorKind = 'INVALID';
  declare readonly issues: readonly DomainIssue[];

  constructor() {
    super('Falta la nota del cobrador: lo cobrado difiere de lo esperado.', {
      issues: [
        {
          path: ['collectorNote'],
          message: 'validation.settlement.note_required',
        },
      ],
    });
  }
}
