import { BusinessDateSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Parámetros de `GET /collectors/:id/stats`: el período, opcional. */
export const GetManagedCollectorStatsQuerySchema = z
  .strictObject({
    from: BusinessDateSchema.optional().meta({
      description:
        'Primera fecha del período. Ausente para el primer día del mes actual.',
      example: '2026-10-01',
    }),
    to: BusinessDateSchema.optional().meta({
      description: 'Última fecha del período. Ausente para hoy.',
      example: '2026-10-09',
    }),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'La fecha final debe ser igual o posterior a la inicial.',
    path: ['to'],
  });
