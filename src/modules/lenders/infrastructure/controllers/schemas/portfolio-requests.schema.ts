import { z } from 'zod';

/** Cuerpo de `POST /portfolios`. */
export const CreatePortfolioRequestSchema = z.strictObject({
  name: z.string().min(1).meta({
    description: 'Nombre de la cartera, único dentro del prestamista.',
    example: 'Zona Norte',
  }),
});
