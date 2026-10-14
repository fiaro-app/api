import { boundedDateRange } from '@fiaro-app/contracts';
import { z } from 'zod';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `QUERY /lenders/me/stats`. Los tres filtros son combinables entre sí. */
export const GetLenderStatsRequestSchema = z.strictObject({
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.stats).optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
  collectorMembershipId: z.uuid().optional().meta({
    description: 'Solo los préstamos que este cobrador tiene asignados hoy.',
  }),
  portfolioId: z.uuid().optional().meta({
    description: 'Solo los cobradores de esta cartera, y sus préstamos.',
  }),
  includePrevious: z.boolean().optional().meta({
    description:
      'Si es `true`, la respuesta trae también el período anterior de la misma duración (`previous`), para calcular tendencias. Ausente o `false`: `previous` sale `null`.',
  }),
});
