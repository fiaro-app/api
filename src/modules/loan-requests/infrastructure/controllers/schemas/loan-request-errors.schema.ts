import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato, o falta el cliente. */
export const LoanRequestValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'LoanRequestValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para la acción. */
export const LoanRequestForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'LoanRequestForbidden' });

/** `404 NOT_FOUND`: la solicitud no existe para el prestamista de la sesión. */
export const LoanRequestNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'LoanRequestNotFound' });

/** `409 CONFLICT`: la solicitud ya fue resuelta, o la cédula del cliente nuevo ya existe. */
export const LoanRequestConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'LoanRequestConflict' });
