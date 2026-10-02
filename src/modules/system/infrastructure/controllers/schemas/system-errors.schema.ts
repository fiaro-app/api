import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `503 MAINTENANCE`: operaciones declaró una ventana de mantenimiento. */
export const MaintenanceErrorSchema = ApiErrorSchema.extend({
  code: z.literal('MAINTENANCE'),
}).meta({ id: 'SystemMaintenance' });
