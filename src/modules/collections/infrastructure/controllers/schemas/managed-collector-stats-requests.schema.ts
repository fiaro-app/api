import { BusinessDateSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Parámetros de `GET /collectors/:id/stats`: el período, opcional. */
export const GetManagedCollectorStatsQuerySchema = z
  .strictObject({
    from: BusinessDateSchema.optional().meta({
      description:
        'Primera fecha del período. Va junto con `to`; sin ambas, es el mes actual.',
      example: '2026-10-01',
    }),
    to: BusinessDateSchema.optional().meta({
      description: 'Última fecha del período. Va junto con `from`.',
      example: '2026-10-09',
    }),
  })
  .refine((query) => (query.from === undefined) === (query.to === undefined), {
    message: 'Debes enviar from y to juntos, o ninguno.',
    path: ['to'],
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: 'La fecha final debe ser igual o posterior a la inicial.',
    path: ['to'],
  });
