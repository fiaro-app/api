import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `403 FORBIDDEN`: sin ninguna membresía activa con un prestamista. */
export const LoanBalanceForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'LoanBalanceForbidden' });

/** `404 NOT_FOUND`: el préstamo no existe, o es de otro prestamista. */
export const LoanBalanceNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'LoanBalanceNotFound' });
