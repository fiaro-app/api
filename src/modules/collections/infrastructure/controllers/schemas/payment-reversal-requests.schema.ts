import { NoteSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `POST /payments/:id/reversals`. */
export const CreatePaymentReversalRequestSchema = z.strictObject({
  reason: NoteSchema.meta({
    description: 'Motivo de la reversión.',
    example: 'El cobrador registró el monto equivocado.',
  }),
});
