import { DateRangeSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `QUERY /lenders/me/stats`. Los tres filtros son combinables entre sí. */
export const GetLenderStatsRequestSchema = z.strictObject({
  dateRange: DateRangeSchema.optional().meta({
    description:
      'Período a consultar. Ausente para el mes actual (desde el día 1 hasta hoy).',
  }),
  collectorMembershipId: z.uuid().optional().meta({
    description: 'Solo los préstamos que este cobrador tiene asignados hoy.',
  }),
  portfolioId: z.uuid().optional().meta({
    description: 'Solo los cobradores de esta cartera, y sus préstamos.',
  }),
});
