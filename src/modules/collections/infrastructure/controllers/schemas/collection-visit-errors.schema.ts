import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el resultado, el pago o la fecha prometida no combinan. */
export const CollectionVisitValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'CollectionVisitValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol COLLECTOR. */
export const CollectionVisitForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'CollectionVisitForbidden' });

/** `404 NOT_FOUND`: el préstamo no existe para el prestamista de la sesión. */
export const CollectionVisitNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'CollectionVisitNotFound' });
