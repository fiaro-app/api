import { z } from 'zod';
import type { LenderPeriodStats } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';

/** Un bucket fijo de antigüedad de mora. */
const ArrearsBucketResponseSchema = z
  .object({
    label: z.enum(['0-7', '8-15', '16-30', '30+']).meta({
      description: 'Días de mora que agrupa este bucket.',
    }),
    amount: z.int().nonnegative().meta({
      description: 'Suma del saldo de los préstamos en este bucket.',
    }),
    clientsCount: z.int().nonnegative().meta({
      description:
        'Clientes distintos con al menos un préstamo en este bucket.',
    }),
  })
  .meta({ id: 'ArrearsBucketResponse' });

/** Un cliente en el ranking de mayor mora. */
const TopArrearsEntryResponseSchema = z
  .object({
    clientId: z.uuid().meta({ description: 'El cliente.' }),
    clientFullName: z.string().meta({ description: 'Su nombre completo.' }),
    overdueDays: z.int().nonnegative().meta({
      description:
        'El mayor de los días de mora, entre sus préstamos vencidos.',
    }),
    overdueAmount: z.int().nonnegative().meta({
      description:
        'La suma de lo vencido y sin pagar, entre sus préstamos vencidos.',
    }),
  })
  .meta({ id: 'TopArrearsEntryResponse' });

/** El desempeño de un cobrador en el período, visto por el Lender. */
const LenderStatsCollectorPerformanceResponseSchema = z
  .object({
    collectorMembershipId: z.uuid().meta({ description: 'El cobrador.' }),
    fullName: z.string().meta({ description: 'Su nombre completo.' }),
    effectiveness: z.number().min(0).nullable().meta({
      description:
        'collectedAmount / expectedAmount del período. null si no había nada esperado.',
    }),
    overdueAmount: z.int().nonnegative().meta({
      description: 'Lo vencido y sin pagar hoy, de su cartera.',
    }),
  })
  .meta({ id: 'LenderStatsCollectorPerformanceResponse' });

/** Respuesta de `QUERY /lenders/me/stats`. */
export const LenderPeriodStatsResponseSchema = z
  .object({
    from: z.iso.date().meta({ description: 'Primera fecha del período.' }),
    to: z.iso.date().meta({ description: 'Última fecha del período.' }),
    totalPortfolio: z.int().nonnegative().meta({
      description:
        'Suma del saldo de los préstamos activos que cumplen los filtros.',
    }),
    portfolioAtRisk: z.int().nonnegative().meta({
      description:
        'Suma del saldo de los que, además, tienen algo vencido sin pagar hoy.',
    }),
    arrearsRate: z.number().min(0).nullable().meta({
      description:
        'portfolioAtRisk / totalPortfolio. null si totalPortfolio es cero.',
    }),
    arrearsByAge: z.array(ArrearsBucketResponseSchema).length(4).meta({
      description:
        'Los 4 buckets fijos de antigüedad, siempre en el mismo orden.',
    }),
    topArrears: z.array(TopArrearsEntryResponseSchema).meta({
      description:
        'Los clientes con mayor mora, descendente por días y luego por monto.',
    }),
    collectorPerformance: z
      .array(LenderStatsCollectorPerformanceResponseSchema)
      .meta({
        description: 'El desempeño de cada cobrador que cumple los filtros.',
      }),
  })
  .meta({ id: 'LenderPeriodStatsResponse' });

/** @param stats - Las métricas, tal como las devuelve el caso de uso. */
export function toLenderPeriodStatsResponse(
  stats: LenderPeriodStats,
): z.output<typeof LenderPeriodStatsResponseSchema> {
  return {
    from: stats.from,
    to: stats.to,
    totalPortfolio: stats.totalPortfolio,
    portfolioAtRisk: stats.portfolioAtRisk,
    arrearsRate: stats.arrearsRate,
    arrearsByAge: [...stats.arrearsByAge],
    topArrears: [...stats.topArrears],
    collectorPerformance: [...stats.collectorPerformance],
  };
}
