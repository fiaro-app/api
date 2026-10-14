import {
  boundedDateRange,
  IdSchema,
  PageQuerySchema,
  VisitOutcomeSchema,
} from '@fiaro-app/contracts';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `QUERY /collection-visits`. Los filtros son combinables entre sí. */
export const SearchCollectionVisitsRequestSchema = PageQuerySchema.extend({
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.visits).optional().meta({
    description:
      'Período a consultar, por la hora de la visita (hora de Colombia). Ausente para solo hoy.',
  }),
  collectorMembershipId: IdSchema.optional().meta({
    description: 'Solo las visitas de este cobrador.',
  }),
  portfolioId: IdSchema.optional().meta({
    description: 'Solo las visitas de los cobradores de esta cartera.',
  }),
  outcome: VisitOutcomeSchema.optional().meta({
    description: 'Solo las visitas que terminaron así.',
  }),
});
