import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  AttachmentForbiddenSchema,
  AttachmentNotFoundSchema,
  AttachmentValidationErrorSchema,
} from '@/modules/attachments/infrastructure/controllers/schemas/attachment-errors.schema.js';
import {
  AttachmentUploadResponseSchema,
  AttachmentViewResponseSchema,
} from '@/modules/attachments/infrastructure/controllers/schemas/attachment.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

type Operation = 'upload-url' | 'attach' | 'view' | 'remove';

const COPY: Record<
  'proof',
  Record<Operation, { summary: string; description: string }>
> = {
  proof: {
    'upload-url': {
      summary: 'Pedir la URL firmada para subir el comprobante de un pago',
      description:
        'El archivo (captura de Nequi o transferencia, PNG o JPEG de hasta 5 MB) va directo al bucket con un PUT. Después se guarda con `POST /payments/:id/proof`. Quien administra, o el cobrador que hizo ese cobro.',
    },
    attach: {
      summary: 'Guardar el comprobante de un pago ya subido',
      description:
        'Verifica que el archivo exista, sea de este pago y sea de verdad un PNG o JPEG; reemplaza el anterior. Quien administra, o el cobrador que hizo ese cobro.',
    },
    view: {
      summary: 'Ver el comprobante de un pago',
      description:
        'Devuelve una URL firmada que vence en minutos, o `url: null` si no tiene. Quien administra, o el cobrador que hizo ese cobro.',
    },
    remove: {
      summary: 'Quitar el comprobante de un pago',
      description:
        'Lo borra del bucket. Repetirlo no falla. Quien administra, o el cobrador que hizo ese cobro.',
    },
  },
};

/**
 * Documenta una ruta de imágenes privadas.
 *
 * @param subject - `proof` (comprobante de un pago).
 * @param operation - Qué hace la ruta.
 */
export const ApiAttachmentRoute = (subject: 'proof', operation: Operation) => {
  const ok =
    operation === 'upload-url'
      ? {
          status: 201,
          description: 'La URL firmada y la llave.',
          standardSchema: AttachmentUploadResponseSchema,
        }
      : operation === 'view'
        ? {
            status: 200,
            description: 'La URL firmada, o null.',
            standardSchema: AttachmentViewResponseSchema,
          }
        : { status: 204, description: 'Hecho.' };
  return applyDecorators(
    ApiOperation(COPY[subject][operation]),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse(ok),
    ApiResponse({
      status: 400,
      description:
        'El cuerpo no cumple el contrato, o el archivo no es una foto válida (`VALIDATION_FAILED`).',
      standardSchema: AttachmentValidationErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description: 'Sin permiso sobre esa foto (`FORBIDDEN`).',
      standardSchema: AttachmentForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description: 'El pago no existe para este prestamista (`NOT_FOUND`).',
      standardSchema: AttachmentNotFoundSchema,
    }),
  );
};
