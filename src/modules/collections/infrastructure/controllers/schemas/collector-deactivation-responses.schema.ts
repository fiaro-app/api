import { z } from 'zod';
import type { DeactivateCollectorResult } from '@/modules/collections/application/dtos/deactivate-collector.dto.js';

/** Respuesta de `POST /collectors/:id/deactivate`. */
export const CollectorDeactivationResponseSchema = z
  .object({
    id: z
      .uuid()
      .meta({ description: 'La membresía del cobrador, ya dada de baja.' }),
    status: z.literal('INACTIVE').meta({
      description:
        'Siempre INACTIVE: la respuesta solo llega si la baja se completó.',
    }),
    reassignedLoans: z.int().nonnegative().meta({
      description: 'Cuántos préstamos activos cambiaron de cobrador.',
    }),
  })
  .meta({ id: 'CollectorDeactivationResponse' });

/** @param result - Los datos de la baja, tal como los devuelve el caso de uso. */
export function toCollectorDeactivationResponse(
  result: DeactivateCollectorResult,
): z.output<typeof CollectorDeactivationResponseSchema> {
  return {
    id: result.membershipId,
    status: 'INACTIVE',
    reassignedLoans: result.reassignedLoans,
  };
}
