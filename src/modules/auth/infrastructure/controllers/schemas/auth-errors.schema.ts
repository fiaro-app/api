import { ApiErrorSchema, ValidationIssueSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/**
 * Error de better-auth o del guard, con la forma de error de la API (`ApiError`): `code` estable
 * para reaccionar en la app y `message` para mostrar, en el idioma de `Accept-Language`.
 */
export const AuthErrorSchema = ApiErrorSchema.extend({
  code: z.string().meta({
    description: 'Código estable: las apps reaccionan a él, no al texto.',
    example: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
  }),
  message: z.string().meta({
    description: 'Descripción del error, en el idioma de `Accept-Language`.',
  }),
}).meta({ id: 'AuthError' });

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el schema; `issues` dice qué campo y por qué. */
export const ValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
  issues: z.array(ValidationIssueSchema),
}).meta({ id: 'ValidationError' });

/** `429 RATE_LIMITED`: demasiados intentos; `Retry-After` dice cuántos segundos esperar. */
export const RateLimitedSchema = ApiErrorSchema.extend({
  code: z.literal('RATE_LIMITED'),
}).meta({ id: 'RateLimited' });

/** `429 SIGN_IN_LOCKED`: ese celular agotó sus intentos; `Retry-After` dice cuántos segundos faltan. */
export const SignInLockedSchema = ApiErrorSchema.extend({
  code: z.literal('SIGN_IN_LOCKED'),
}).meta({ id: 'SignInLocked' });
