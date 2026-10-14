import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato. */
export const PaymentReversalValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'PaymentReversalValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para reversar. */
export const PaymentReversalForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'PaymentReversalForbidden' });

/** `404 NOT_FOUND`: el pago no existe, o es de otro prestamista. */
export const PaymentReversalNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'PaymentReversalNotFound' });

/** `409 CONFLICT`: ese pago ya tiene una reversión. */
export const PaymentReversalConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'PaymentReversalConflict' });
