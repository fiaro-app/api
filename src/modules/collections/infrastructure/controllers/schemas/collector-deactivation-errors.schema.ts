import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: las reasignaciones no cubren exactamente los préstamos activos, o algún cobrador destino no sirve. */
export const CollectorDeactivationValidationErrorSchema = ApiErrorSchema.extend(
  {
    code: z.literal('VALIDATION_FAILED'),
  },
).meta({ id: 'CollectorDeactivationValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, sin el rol para dar de baja, o sobre la propia membresía. */
export const CollectorDeactivationForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'CollectorDeactivationForbidden' });

/** `404 NOT_FOUND`: la membresía no existe, o no tiene el rol COLLECTOR, en el prestamista de la sesión. */
export const CollectorDeactivationNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'CollectorDeactivationNotFound' });

/** `409 CONFLICT`: el cobrador tiene asignaciones programadas para después de hoy. */
export const CollectorDeactivationConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'CollectorDeactivationConflict' });
