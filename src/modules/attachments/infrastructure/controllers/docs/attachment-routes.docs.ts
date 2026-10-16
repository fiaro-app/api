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
  'photo' | 'proof',
  Record<Operation, { summary: string; description: string }>
> = {
  photo: {
    'upload-url': {
      summary: 'Pedir la URL firmada para subir la foto de un cliente',
      description:
        'El archivo (PNG o JPEG de hasta 5 MB) va directo del dispositivo al bucket con un PUT; la URL firma el tipo y el peso. Después se guarda con `POST /clients/:id/photo`. Solo `OWNER` o `LENDER`.',
    },
    attach: {
      summary: 'Guardar la foto de un cliente ya subida',
      description:
        'Verifica que el archivo exista, sea de este cliente y sea de verdad un PNG o JPEG; reemplaza la anterior. Solo `OWNER` o `LENDER`.',
    },
    view: {
      summary: 'Ver la foto de un cliente',
      description:
        'Devuelve una URL firmada que vence en minutos (la foto nunca es pública), o `url: null` si no tiene. Quien administra, o el cobrador que tiene o tuvo a ese cliente asignado.',
    },
    remove: {
      summary: 'Quitar la foto de un cliente',
      description:
        'La borra del bucket. Repetirlo no falla. Solo `OWNER` o `LENDER`.',
    },
  },
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
 * Documenta una ruta de fotos privadas.
 *
 * @param subject - `photo` (cliente) o `proof` (pago).
 * @param operation - Qué hace la ruta.
 */
export const ApiAttachmentRoute = (
  subject: 'photo' | 'proof',
  operation: Operation,
) => {
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
      description:
        'El cliente o el pago no existe para este prestamista (`NOT_FOUND`).',
      standardSchema: AttachmentNotFoundSchema,
    }),
  );
};
