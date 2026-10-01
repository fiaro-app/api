import { z } from 'zod';
import type { CollectionAssignmentDetails } from '@/modules/collections/application/dtos/collection-assignment-details.dto.js';

/** Respuesta con los datos públicos de una asignación de cobro. */
export const CollectionAssignmentResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la asignación.' }),
    loanId: z.uuid().meta({ description: 'El préstamo asignado.' }),
    collectorMembershipId: z.uuid().meta({
      description: 'La membresía (rol COLLECTOR) que cobra.',
    }),
    effectiveFrom: z.iso.date().meta({
      description: 'Fecha desde la que rige.',
    }),
    effectiveTo: z.iso.date().nullable().meta({
      description:
        'null: vigente sin fecha de fin. Igual a effectiveFrom: reemplazo de un solo día.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se creó.',
    }),
  })
  .meta({ id: 'CollectionAssignmentResponse' });

/** Respuesta de `GET /loans/:loanId/collection-assignments`: el historial completo, sin paginar. */
export const CollectionAssignmentsResponseSchema = z
  .array(CollectionAssignmentResponseSchema)
  .meta({ id: 'CollectionAssignmentsResponse' });

/** @param details - Los datos de la asignación, tal como los devuelve el caso de uso. */
export function toCollectionAssignmentResponse(
  details: CollectionAssignmentDetails,
): z.output<typeof CollectionAssignmentResponseSchema> {
  return {
    id: details.id,
    loanId: details.loanId,
    collectorMembershipId: details.collectorMembershipId,
    effectiveFrom: details.effectiveFrom,
    effectiveTo: details.effectiveTo,
    createdAt: details.createdAt.toISOString(),
  };
}

/** @param list - Las asignaciones, tal como las devuelve el caso de uso. */
export function toCollectionAssignmentsResponse(
  list: readonly CollectionAssignmentDetails[],
): z.output<typeof CollectionAssignmentsResponseSchema> {
  return list.map(toCollectionAssignmentResponse);
}
