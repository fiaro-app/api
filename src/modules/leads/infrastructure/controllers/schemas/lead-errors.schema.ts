import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: algún dato no cumple las reglas. */
export const LeadValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'LeadValidationError' });

/** `429 RATE_LIMITED`: demasiados contactos desde la misma dirección. */
export const LeadRateLimitedSchema = ApiErrorSchema.extend({
  code: z.literal('RATE_LIMITED'),
}).meta({ id: 'LeadRateLimited' });
