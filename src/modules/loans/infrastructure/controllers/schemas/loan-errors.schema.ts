import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato. */
export const LoanValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'LoanValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para crear. */
export const LoanForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'LoanForbidden' });

/** `403 PLAN_LIMIT_REACHED`: el negocio ya tiene todos los préstamos activos que permite su plan. */
export const LoanPlanLimitReachedSchema = ApiErrorSchema.extend({
  code: z.literal('PLAN_LIMIT_REACHED'),
}).meta({ id: 'LoanPlanLimitReached' });

/** `404 NOT_FOUND`: el préstamo, o el cliente, no existe para el prestamista de la sesión. */
export const LoanNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'LoanNotFound' });

/** `422 LOAN_NOT_CANCELABLE`: el préstamo ya no está `ACTIVE`. */
export const LoanNotCancelableSchema = ApiErrorSchema.extend({
  code: z.literal('LOAN_NOT_CANCELABLE'),
}).meta({ id: 'LoanNotCancelable' });
