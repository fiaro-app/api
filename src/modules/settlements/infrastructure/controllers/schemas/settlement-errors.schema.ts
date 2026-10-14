import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato, o falta `collectorNote`. */
export const SettlementValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'SettlementValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para la acción. */
export const SettlementForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'SettlementForbidden' });

/** `404 NOT_FOUND`: el cuadre no existe, o es de otro prestamista. */
export const SettlementNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'SettlementNotFound' });

/** `409 CONFLICT`: ese cuadre ya se revisó. */
export const SettlementConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'SettlementConflict' });
