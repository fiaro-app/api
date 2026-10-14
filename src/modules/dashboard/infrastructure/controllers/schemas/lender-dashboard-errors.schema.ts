import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para administrar el prestamista. */
export const LenderDashboardForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'LenderDashboardForbidden' });
