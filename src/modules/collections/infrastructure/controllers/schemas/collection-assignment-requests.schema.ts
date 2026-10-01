import { BusinessDateSchema, IdSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `POST /loans/:loanId/collection-assignments`. */
export const CreateCollectionAssignmentRequestSchema = z.strictObject({
  collectorMembershipId: IdSchema.meta({
    description: 'La membresía (rol COLLECTOR) que cobrará.',
  }),
  effectiveFrom: BusinessDateSchema.meta({
    description: 'Fecha desde la que rige.',
    example: '2026-10-01',
  }),
  effectiveTo: BusinessDateSchema.nullable().optional().meta({
    description:
      'Ausente o null: permanente, cierra la asignación vigente del préstamo si tiene una. Igual a effectiveFrom: reemplazo de un solo día, no toca la permanente.',
  }),
});
