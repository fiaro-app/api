import { BusinessDateSchema, DateRangeSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `QUERY /collectors/me/daily-summary`. */
export const GetCollectorDailySummaryRequestSchema = z.strictObject({
  date: BusinessDateSchema.optional().meta({
    description: 'Fecha del resumen. Ausente para la de hoy.',
    example: '2026-10-07',
  }),
});

/** Cuerpo de `QUERY /collectors/me/stats`. */
export const GetCollectorStatsRequestSchema = z.strictObject({
  dateRange: DateRangeSchema.optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
});
