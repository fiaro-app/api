import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: la membresía no tiene el rol COLLECTOR, o las fechas no cumplen la regla. */
export const CollectionAssignmentValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'CollectionAssignmentValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para asignar. */
export const CollectionAssignmentForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'CollectionAssignmentForbidden' });

/** `404 NOT_FOUND`: el préstamo o la membresía no existen para el prestamista de la sesión. */
export const CollectionAssignmentNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'CollectionAssignmentNotFound' });
