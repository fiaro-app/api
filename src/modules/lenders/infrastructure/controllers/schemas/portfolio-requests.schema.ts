import { z } from 'zod';

/** Cuerpo de `POST /portfolios`. */
export const CreatePortfolioRequestSchema = z.strictObject({
  name: z.string().min(1).meta({
    description: 'Nombre de la cartera, único dentro del prestamista.',
    example: 'Zona Norte',
  }),
});

/** Cuerpo de `PATCH /portfolios/:id`: el nombre nuevo. */
export const UpdatePortfolioRequestSchema = z.strictObject({
  name: z.string().min(1).meta({
    description: 'Nombre nuevo de la cartera, único dentro del prestamista.',
    example: 'Zona Sur',
  }),
});
