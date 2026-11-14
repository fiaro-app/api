import {
  boundedDateRange,
  paginated,
  PageQuerySchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import type {
  LenderStatsCollectorPerformance,
  LenderStatsPage,
  LenderStatsTopArrearsEntry,
} from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import {
  LenderStatsCollectorPerformanceResponseSchema,
  TopArrearsEntryResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-responses.schema.js';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `QUERY /lenders/me/stats/top-arrears`: la mora es la de hoy, así que no lleva período. */
export const ListTopArrearsRequestSchema = PageQuerySchema.extend({
  collectorMembershipId: z.uuid().optional().meta({
    description: 'Solo los préstamos que este cobrador tiene asignados hoy.',
  }),
  portfolioId: z.uuid().optional().meta({
    description: 'Solo los préstamos de los cobradores de esta cartera.',
  }),
});

/** Cuerpo de `QUERY /lenders/me/stats/collector-performance`. */
export const ListCollectorPerformanceRequestSchema = PageQuerySchema.extend({
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.stats).optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
  portfolioId: z.uuid().optional().meta({
    description: 'Solo los cobradores de esta cartera.',
  }),
});

/** Página del ranking de mayor mora. */
export const TopArrearsPageResponseSchema = paginated(
  TopArrearsEntryResponseSchema,
).meta({ id: 'TopArrearsPageResponse' });

/** Página del desempeño por cobrador. */
export const CollectorPerformancePageResponseSchema = paginated(
  LenderStatsCollectorPerformanceResponseSchema,
).meta({ id: 'CollectorPerformancePageResponse' });

/**
 * @param page - Lo que devolvió el caso de uso.
 * @param query - La página pedida, para `meta`.
 */
export function toStatsPageResponse<
  T extends LenderStatsTopArrearsEntry | LenderStatsCollectorPerformance,
>(
  page: LenderStatsPage<T>,
  query: { readonly page: number; readonly pageSize: number },
): { data: T[]; meta: { page: number; pageSize: number; total: number } } {
  return {
    data: [...page.items],
    meta: { page: query.page, pageSize: query.pageSize, total: page.total },
  };
}
