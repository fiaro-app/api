import { z } from 'zod';
import {
  IMAGE_CONTENT_TYPES,
  IMAGE_MAX_BYTES,
} from '@/shared/domain/images/image-policy.js';

/** Cuerpo de `POST .../upload-url`: el tipo y el peso exactos del archivo, que la URL firma. */
export const AttachmentUploadRequestSchema = z.strictObject({
  contentType: z.enum(IMAGE_CONTENT_TYPES).meta({
    description: 'Tipo del archivo: PNG o JPEG.',
    example: 'image/jpeg',
  }),
  sizeBytes: z.int().min(1).max(IMAGE_MAX_BYTES).meta({
    description: 'Peso exacto del archivo, en bytes (hasta 5 MB).',
    example: 240_000,
  }),
});

/** Cuerpo de `POST .../photo` y `POST .../proof`: la llave que devolvió la URL firmada. */
export const AttachImageRequestSchema = z.strictObject({
  key: z.string().min(1).max(300).meta({
    description:
      'La llave del archivo subido, tal como la devolvió `upload-url`.',
  }),
});

/** Respuesta de `POST .../upload-url`. */
export const AttachmentUploadResponseSchema = z
  .object({
    uploadUrl: z.url().meta({
      description:
        'URL firmada para subir el archivo con un PUT (vence en minutos).',
    }),
    key: z.string().meta({
      description:
        'La llave con la que, ya subido el archivo, se guarda la foto.',
    }),
    expiresAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo deja de servir `uploadUrl`.',
    }),
  })
  .meta({ id: 'AttachmentUploadResponse' });

/** Respuesta de `GET .../photo` y `GET .../proof`. */
export const AttachmentViewResponseSchema = z
  .object({
    url: z.url().nullable().meta({
      description:
        'URL firmada para ver la foto (vence en minutos), o null si no tiene.',
    }),
    expiresAt: z.iso.datetime({ offset: true }).nullable().meta({
      description: 'Cuándo vence `url`, o null si no hay foto.',
    }),
  })
  .meta({ id: 'AttachmentViewResponse' });
