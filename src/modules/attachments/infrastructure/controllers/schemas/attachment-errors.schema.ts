import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato, o el archivo no es una foto válida de este dueño. */
export const AttachmentValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'AttachmentValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin permiso sobre esa foto. */
export const AttachmentForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'AttachmentForbidden' });

/** `404 NOT_FOUND`: el cliente o el pago no existe para el prestamista de la sesión. */
export const AttachmentNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'AttachmentNotFound' });
