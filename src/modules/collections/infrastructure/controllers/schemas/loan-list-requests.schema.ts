import {
  IdSchema,
  LoanStatusSchema,
  PageQuerySchema,
} from '@fiaro-app/contracts';

/** Cuerpo de `QUERY /loans`: paginación y filtros opcionales. */
export const ListLoansWithBalanceRequestSchema = PageQuerySchema.extend({
  clientId: IdSchema.optional().meta({
    description:
      'Solo los préstamos de este cliente. Ausente para listar los de todos.',
  }),
  status: LoanStatusSchema.optional().meta({
    description:
      'Solo los préstamos en este estado. Ausente para listar todos.',
  }),
});
