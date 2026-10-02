import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol `COLLECTOR`. */
export const CollectorRouteForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'CollectorRouteForbidden' });
