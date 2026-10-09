import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato. */
export const PortfolioValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'PortfolioValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para crear. */
export const PortfolioForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'PortfolioForbidden' });

/** `409 CONFLICT`: ya existe una cartera con ese nombre para este prestamista. */
export const PortfolioConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'PortfolioConflict' });

/** `404 NOT_FOUND`: la cartera no existe, o es de otro prestamista. */
export const PortfolioNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'PortfolioNotFound' });
