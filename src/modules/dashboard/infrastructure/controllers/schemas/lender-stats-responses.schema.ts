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
export const TopArrearsEntryResponseSchema = z
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
export const LenderStatsCollectorPerformanceResponseSchema = z
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

/** El período anterior, de la misma duración y justo antes del pedido, para las tendencias. */
const LenderPreviousPeriodResponseSchema = z
  .object({
    from: z.iso
      .date()
      .meta({ description: 'Primera fecha del período anterior.' }),
    to: z.iso
      .date()
      .meta({ description: 'Última fecha del período anterior.' }),
    totalPortfolio: z.int().nonnegative().meta({
      description:
        'Cartera total que tenía el negocio al cierre del período anterior.',
    }),
    portfolioAtRisk: z.int().nonnegative().meta({
      description: 'Cartera en riesgo al cierre del período anterior.',
    }),
    arrearsRate: z.number().min(0).nullable().meta({
      description:
        'portfolioAtRisk / totalPortfolio al cierre. null si la cartera era cero.',
    }),
    expectedAmount: z.int().nonnegative().meta({
      description: 'Lo que vencía en los días del período anterior.',
    }),
    collectedAmount: z.int().nonnegative().meta({
      description: 'Lo que se cobró en los días del período anterior.',
    }),
    effectiveness: z.number().min(0).nullable().meta({
      description:
        'collectedAmount / expectedAmount. null si no había nada esperado.',
    }),
  })
  .meta({ id: 'LenderPreviousPeriodResponse' });

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
        'Los 5 clientes con mayor mora, descendente por días y luego por monto. El ranking completo, paginado: `QUERY /lenders/me/stats/top-arrears`.',
    }),
    collectorPerformance: z
      .array(LenderStatsCollectorPerformanceResponseSchema)
      .meta({
        description:
          'El desempeño de los primeros 5 cobradores que cumplen los filtros (del más antiguo al más nuevo). Todos, paginados: `QUERY /lenders/me/stats/collector-performance`.',
      }),
    expectedAmount: z.int().nonnegative().meta({
      description:
        'Lo que vencía en el período, sumado entre los cobradores que cumplen los filtros.',
    }),
    collectedAmount: z.int().nonnegative().meta({
      description:
        'Lo que esos cobradores cobraron en el período, sin los pagos reversados.',
    }),
    effectiveness: z.number().min(0).nullable().meta({
      description:
        'collectedAmount / expectedAmount. null si no había nada esperado.',
    }),
    previous: LenderPreviousPeriodResponseSchema.nullable().meta({
      description:
        'El período anterior, de la misma duración, para calcular tendencias. null si la petición no trae includePrevious: true.',
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
    expectedAmount: stats.expectedAmount,
    collectedAmount: stats.collectedAmount,
    effectiveness: stats.effectiveness,
    previous: stats.previous,
  };
}
