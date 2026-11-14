import { z } from 'zod';
import {
  LOGO_CONTENT_TYPES,
  LOGO_MAX_BYTES,
} from '@/modules/lenders/domain/logo-policy.js';

/** Cuerpo de `POST /lender/logo-upload-url`. */
export const GetLenderLogoUploadUrlRequestSchema = z.strictObject({
  contentType: z.enum(LOGO_CONTENT_TYPES).meta({
    description:
      'Tipo de imagen que se va a subir: solo PNG o JPEG (PROTOTIPO-FLUJOS.md §4.9).',
  }),
  sizeBytes: z.int().min(1).max(LOGO_MAX_BYTES).meta({
    description:
      'Peso exacto del archivo en bytes, hasta 2 MB. La URL firmada solo acepta una subida de ese tamaño.',
    example: 48_213,
  }),
});
