import { z } from 'zod';

/** Respuesta de `POST /leads`: el contacto quedó recibido. */
export const LeadReceivedResponseSchema = z
  .object({
    received: z.literal(true).meta({
      description:
        'El contacto quedó recibido. Ventas responderá por el medio que dejaste.',
    }),
  })
  .meta({ id: 'LeadReceivedResponse' });
