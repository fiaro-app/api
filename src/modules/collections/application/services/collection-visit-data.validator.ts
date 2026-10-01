import type { CollectionVisitPaymentInput } from '@/modules/collections/application/dtos/collection-visit-details.dto.js';
import type { VisitOutcome } from '@/modules/collections/domain/entities/visit-outcome.js';
import { InvalidCollectionVisitDataError } from '@/modules/collections/domain/errors/invalid-collection-visit-data.error.js';
import type { DomainIssue } from '@/shared/domain/errors/domain-error.js';

/** Lo que decide si una visita trae un pago o una fecha prometida. */
export interface CollectionVisitDataInput {
  readonly outcome: VisitOutcome;
  readonly promisedDate?: string | null;
  readonly payment?: CollectionVisitPaymentInput | null;
}

/**
 * Valida que el resultado de la visita combine con lo que trae el pedido: `PAID` exige un pago y
 * ningún otro resultado lo acepta; `RESCHEDULED` exige `promisedDate` y ningún otro resultado lo
 * acepta. No existe un resultado "parcial" (PRODUCT.md §5): si hubo dinero, es `PAID`, sin
 * importar si el monto fue menor o mayor al esperado.
 *
 * @param input - El resultado de la visita y lo que trae el pedido.
 * @throws {@link InvalidCollectionVisitDataError} Con un `issue` por cada campo que no combina.
 */
export function validateCollectionVisitData(
  input: CollectionVisitDataInput,
): void {
  const issues: DomainIssue[] = [];

  if (input.outcome === 'PAID' && !input.payment) {
    issues.push({
      path: ['payment'],
      message: 'El resultado PAID exige un pago.',
      params: {},
    });
  }
  if (input.outcome !== 'PAID' && input.payment) {
    issues.push({
      path: ['payment'],
      message: 'Solo el resultado PAID puede traer un pago.',
      params: {},
    });
  }
  if (input.outcome === 'RESCHEDULED' && !input.promisedDate) {
    issues.push({
      path: ['promisedDate'],
      message: 'El resultado RESCHEDULED exige promisedDate.',
      params: {},
    });
  }
  if (input.outcome !== 'RESCHEDULED' && input.promisedDate) {
    issues.push({
      path: ['promisedDate'],
      message: 'Solo el resultado RESCHEDULED puede traer promisedDate.',
      params: {},
    });
  }

  if (issues.length > 0) {
    throw new InvalidCollectionVisitDataError(issues);
  }
}
