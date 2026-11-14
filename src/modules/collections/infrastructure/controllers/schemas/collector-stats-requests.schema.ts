import { BusinessDateSchema, boundedDateRange } from '@fiaro-app/contracts';
import { z } from 'zod';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `QUERY /collectors/me/daily-summary`. */
export const GetCollectorDailySummaryRequestSchema = z.strictObject({
  date: BusinessDateSchema.optional().meta({
    description: 'Fecha del resumen. Ausente para la de hoy.',
    example: '2026-10-07',
  }),
});

/** Cuerpo de `QUERY /collectors/me/stats`. */
export const GetCollectorStatsRequestSchema = z.strictObject({
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.stats).optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
});
