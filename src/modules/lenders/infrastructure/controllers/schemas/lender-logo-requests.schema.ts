import { z } from 'zod';

/** Cuerpo de `POST /lender/logo-upload-url`. */
export const GetLenderLogoUploadUrlRequestSchema = z.strictObject({
  contentType: z.enum(['image/png', 'image/jpeg']).meta({
    description: 'Tipo de imagen que se va a subir (PROTOTIPO-FLUJOS.md §4.9).',
  }),
});
