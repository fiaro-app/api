import { PageQuerySchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Largo máximo de la búsqueda: un nombre o una cédula caben de sobra y acota el `ILIKE` (D-117). */
export const MAX_SEARCH_LENGTH = 80;

/** Cuerpo de `QUERY /clients`: paginación y búsqueda opcional. */
export const ListClientsWithBalanceRequestSchema = PageQuerySchema.extend({
  search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional().meta({
    description:
      'Texto libre contra el nombre o la cédula, de hasta 80 caracteres. Ausente para listar todos.',
    example: 'Gómez',
  }),
});
