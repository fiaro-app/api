import { boundedDateRange } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { ConsolidatedStats } from '@/modules/dashboard/application/dtos/consolidated-stats.dto.js';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `QUERY /lenders/me/consolidated-stats`. */
export const GetConsolidatedStatsRequestSchema = z.strictObject({
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.stats).optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
});

const money = (description: string) =>
  z.int().nonnegative().meta({ description });
const rate = (description: string) =>
  z.number().min(0).max(1).nullable().meta({ description });

const FiguresSchema = z.object({
  totalPortfolio: money('Saldo de los préstamos activos.'),
  portfolioAtRisk: money('Saldo de los que tienen algo vencido sin pagar hoy.'),
  arrearsRate: rate(
    '`portfolioAtRisk / totalPortfolio`. `null` si la cartera es cero.',
  ),
  expectedAmount: money('Lo que vencía en el período.'),
  collectedAmount: money('Lo cobrado en el período, sin reversiones.'),
  effectiveness: rate(
    '`collectedAmount / expectedAmount`. `null` si no se esperaba nada.',
  ),
});

/** Respuesta de `QUERY /lenders/me/consolidated-stats`. */
export const ConsolidatedStatsResponseSchema = z
  .object({
    from: z.iso.date().meta({ description: 'Primera fecha del período.' }),
    to: z.iso.date().meta({ description: 'Última fecha del período.' }),
    lenders: z
      .array(
        FiguresSchema.extend({
          lenderId: z.uuid().meta({ description: 'El negocio.' }),
          name: z.string().meta({ description: 'Su nombre.' }),
        }),
      )
      .meta({
        description:
          'Las cifras de cada negocio que la persona administra en el Tenant.',
      }),
    totals: FiguresSchema.meta({
      description: 'La suma de todos los negocios.',
    }),
  })
  .meta({ id: 'ConsolidatedStatsResponse' });

/** @param stats - El consolidado ya calculado. */
export const toConsolidatedStatsResponse = (
  stats: ConsolidatedStats,
): z.output<typeof ConsolidatedStatsResponseSchema> => ({
  ...stats,
  lenders: [...stats.lenders],
});
