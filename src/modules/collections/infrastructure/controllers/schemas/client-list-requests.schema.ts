import { PageQuerySchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `QUERY /clients`: paginación y búsqueda opcional. */
export const ListClientsWithBalanceRequestSchema = PageQuerySchema.extend({
  search: z.string().trim().min(1).optional().meta({
    description:
      'Texto libre contra el nombre o la cédula. Ausente para listar todos.',
    example: 'Gómez',
  }),
});
