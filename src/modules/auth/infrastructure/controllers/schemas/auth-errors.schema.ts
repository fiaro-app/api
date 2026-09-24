import { ValidationIssueSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Error de better-auth o del guard: `code` estable para reaccionar en la app, `message` para mostrar. */
export const AuthErrorSchema = z
  .object({
    code: z.string().meta({
      description: 'Código estable: las apps reaccionan a él, no al texto.',
      example: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
    }),
    message: z.string().meta({ description: 'Descripción del error.' }),
  })
  .meta({ id: 'AuthError' });

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el schema; `issues` dice qué campo y por qué. */
export const ValidationErrorSchema = z
  .object({
    code: z.literal('VALIDATION_FAILED'),
    message: z.string(),
    issues: z.array(ValidationIssueSchema),
  })
  .meta({ id: 'ValidationError' });

/** `429 RATE_LIMITED`: demasiados intentos; `Retry-After` dice cuántos segundos esperar. */
export const RateLimitedSchema = z
  .object({ code: z.literal('RATE_LIMITED'), message: z.string() })
  .meta({ id: 'RateLimited' });
