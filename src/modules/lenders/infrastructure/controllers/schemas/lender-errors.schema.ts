import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato. */
export const LenderValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'LenderValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para editar. */
export const LenderForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'LenderForbidden' });
