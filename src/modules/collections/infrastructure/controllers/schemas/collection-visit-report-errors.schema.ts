import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: algún filtro no cumple su schema. */
export const CollectionVisitReportValidationErrorSchema = ApiErrorSchema.extend(
  {
    code: z.literal('VALIDATION_FAILED'),
  },
).meta({ id: 'CollectionVisitReportValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin rol `OWNER` ni `LENDER`. */
export const CollectionVisitReportForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'CollectionVisitReportForbidden' });
