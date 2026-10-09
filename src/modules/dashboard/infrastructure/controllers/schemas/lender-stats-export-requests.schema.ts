import { z } from 'zod';
import { GetLenderStatsRequestSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-requests.schema.js';

/** Cuerpo de `QUERY /lenders/me/stats/export`: los mismos filtros de `/stats`, más el formato. */
export const GetLenderStatsExportRequestSchema =
  GetLenderStatsRequestSchema.omit({ includePrevious: true }).extend({
    format: z.literal('pdf').meta({
      description: 'El único formato disponible por ahora.',
    }),
  });
