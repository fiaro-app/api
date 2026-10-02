import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el id no es un UUID. */
export const NotificationValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'NotificationValidationError' });

/** `404 NOT_FOUND`: la notificación no existe, o no es propia. */
export const NotificationNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'NotificationNotFound' });
