import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato, o la contraseña no cumple su política. */
export const RegistrationValidationErrorSchema = ApiErrorSchema.extend({
  code: z.enum([
    'VALIDATION_FAILED',
    'INVALID_PHONE',
    'INVALID_PASSWORD_LENGTH',
    'PASSWORD_TOO_WEAK',
  ]),
}).meta({ id: 'RegistrationValidationError' });

/** `409 PHONE_ALREADY_REGISTERED`: ya existe una cuenta con ese celular. */
export const RegistrationConflictSchema = ApiErrorSchema.extend({
  code: z.literal('PHONE_ALREADY_REGISTERED'),
}).meta({ id: 'RegistrationConflict' });

/** `400 TURNSTILE_FAILED`: no se pudo verificar el desafío contra robots. */
export const RegistrationTurnstileFailedSchema = ApiErrorSchema.extend({
  code: z.literal('TURNSTILE_FAILED'),
}).meta({ id: 'RegistrationTurnstileFailed' });
