import { BusinessDateSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import {
  addDateRangeIssues,
  DATE_RANGE_LIMITS,
} from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Parámetros de `GET /lenders/me/dashboard`: el período de las cifras cobradas, opcional. */
export const GetLenderDashboardQuerySchema = z
  .strictObject({
    from: BusinessDateSchema.optional().meta({
      description:
        'Primera fecha del período de lo cobrado y lo esperado. Va junto con `to`; sin ambas, es solo hoy.',
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
  .superRefine((query, ctx) => {
    addDateRangeIssues(query, DATE_RANGE_LIMITS.stats, ctx);
  });
