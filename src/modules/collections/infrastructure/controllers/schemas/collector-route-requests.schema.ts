import { BusinessDateSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `QUERY /collectors/me/route`. */
export const GetCollectorRouteRequestSchema = z.strictObject({
  date: BusinessDateSchema.optional().meta({
    description: 'Fecha de la ruta. Ausente para la de hoy.',
    example: '2026-10-02',
  }),
});
