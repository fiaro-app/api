import { z } from 'zod';
import type { PresignedUpload } from '@/shared/application/ports/object-storage.port.js';

/** Respuesta de `POST /lender/logo-upload-url`. */
export const LenderLogoUploadUrlResponseSchema = z
  .object({
    uploadUrl: z.url().meta({
      description:
        'A dónde subir el archivo directo (PUT, con el mismo Content-Type pedido).',
    }),
    publicUrl: z.url().meta({
      description:
        'La URL del logo una vez subido; guárdala con PATCH /lender { logoUrl }.',
    }),
    expiresAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo deja de servir uploadUrl.',
    }),
  })
  .meta({ id: 'LenderLogoUploadUrlResponse' });

/** @param upload - La URL firmada, tal como la devuelve el caso de uso. */
export function toLenderLogoUploadUrlResponse(
  upload: PresignedUpload,
): z.output<typeof LenderLogoUploadUrlResponseSchema> {
  return {
    uploadUrl: upload.uploadUrl,
    publicUrl: upload.publicUrl,
    expiresAt: upload.expiresAt.toISOString(),
  };
}
