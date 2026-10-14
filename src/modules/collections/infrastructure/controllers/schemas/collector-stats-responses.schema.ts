import { z } from 'zod';
import type { CollectorDailySummary } from '@/modules/collections/application/dtos/collector-daily-summary.dto.js';
import type { CollectorPeriodStats } from '@/modules/collections/application/dtos/collector-period-stats.dto.js';
import {
  CollectionVisitResponseSchema,
  toCollectionVisitsResponse,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-responses.schema.js';

/** Lo cobrado, desglosado por medio de pago. */
const CollectedByMethodResponseSchema = z
  .object({
    CASH: z.int().nonnegative().meta({ description: 'Cobrado en efectivo.' }),
    NEQUI: z.int().nonnegative().meta({ description: 'Cobrado por Nequi.' }),
    TRANSFER: z
      .int()
      .nonnegative()
      .meta({ description: 'Cobrado por transferencia.' }),
  })
  .meta({ id: 'CollectedByMethodResponse' });

/** Respuesta de `QUERY /collectors/me/daily-summary`. */
export const CollectorDailySummaryResponseSchema = z
  .object({
    date: z.iso.date().meta({ description: 'La fecha del resumen.' }),
    expectedAmount: z.int().nonnegative().meta({
      description:
        'Lo que el motor de calendario dice que vencía hoy, de los préstamos asignados.',
    }),
    collectedAmount: z.int().nonnegative().meta({
      description: 'Lo que de verdad cobró hoy, sin los pagos reversados.',
    }),
    collectedByMethod: CollectedByMethodResponseSchema,
    visits: z.array(CollectionVisitResponseSchema).meta({
      description: 'Sus visitas de hoy, de la más antigua a la más nueva.',
    }),
  })
  .meta({ id: 'CollectorDailySummaryResponse' });

/** Respuesta de `QUERY /collectors/me/stats`. */
export const CollectorPeriodStatsResponseSchema = z
  .object({
    from: z.iso.date().meta({ description: 'Primera fecha del período.' }),
    to: z.iso.date().meta({ description: 'Última fecha del período.' }),
    expectedAmount: z.int().nonnegative().meta({
      description:
        'Lo que el motor de calendario dice que vencía en el período, de su cartera.',
    }),
    collectedAmount: z.int().nonnegative().meta({
      description: 'Lo que de verdad cobró en el período.',
    }),
    effectiveness: z.number().min(0).nullable().meta({
      description:
        'collectedAmount / expectedAmount. null si expectedAmount es cero.',
    }),
    visitsCount: z.int().nonnegative().meta({
      description: 'Cuántas visitas hizo en el período.',
    }),
    overdueAmount: z.int().nonnegative().meta({
      description: 'Lo vencido y sin pagar hoy, de su cartera.',
    }),
  })
  .meta({ id: 'CollectorPeriodStatsResponse' });

/** @param summary - El resumen, tal como lo devuelve el caso de uso. */
export function toCollectorDailySummaryResponse(
  summary: CollectorDailySummary,
): z.output<typeof CollectorDailySummaryResponseSchema> {
  return {
    date: summary.date,
    expectedAmount: summary.expectedAmount,
    collectedAmount: summary.collectedAmount,
    collectedByMethod: summary.collectedByMethod,
    visits: toCollectionVisitsResponse(summary.visits),
  };
}

/** @param stats - Las métricas, tal como las devuelve el caso de uso. */
export function toCollectorPeriodStatsResponse(
  stats: CollectorPeriodStats,
): z.output<typeof CollectorPeriodStatsResponseSchema> {
  return {
    from: stats.from,
    to: stats.to,
    expectedAmount: stats.expectedAmount,
    collectedAmount: stats.collectedAmount,
    effectiveness: stats.effectiveness,
    visitsCount: stats.visitsCount,
    overdueAmount: stats.overdueAmount,
  };
}
