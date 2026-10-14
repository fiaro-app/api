import {
  DateRangeSchema,
  IdSchema,
  PageQuerySchema,
  VisitOutcomeSchema,
} from '@fiaro-app/contracts';

/** Cuerpo de `QUERY /collection-visits`. Los filtros son combinables entre sí. */
export const SearchCollectionVisitsRequestSchema = PageQuerySchema.extend({
  dateRange: DateRangeSchema.optional().meta({
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
