import { IdSchema, PageQuerySchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `QUERY /notifications`: paginación y filtros opcionales. */
export const ListNotificationsRequestSchema = PageQuerySchema.extend({
  lenderId: IdSchema.optional().meta({
    description:
      'Solo las de este prestamista. Ausente para listar las de todos (una persona puede trabajar para varios).',
  }),
  unreadOnly: z.boolean().optional().meta({
    description: 'Solo las que no se han leído. Ausente para listar todas.',
  }),
});
