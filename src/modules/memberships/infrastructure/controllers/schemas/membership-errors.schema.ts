import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo, los roles o la cartera no cumplen el contrato. */
export const MembershipValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'MembershipValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, sin el rol para administrar, o sobre la propia sesión. */
export const MembershipForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'MembershipForbidden' });

/** `404 NOT_FOUND`: la membresía no existe para el prestamista de la sesión. */
export const MembershipNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'MembershipNotFound' });

/** `409 CONFLICT`: esa persona ya tiene una membresía con este prestamista. */
export const MembershipConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'MembershipConflict' });
