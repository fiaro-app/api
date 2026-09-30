import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo no cumple el contrato. */
export const ClientValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'ClientValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, o sin el rol para crear o editar. */
export const ClientForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'ClientForbidden' });

/** `404 NOT_FOUND`: el cliente no existe para el prestamista de la sesión. */
export const ClientNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'ClientNotFound' });

/** `409 CLIENT_NATIONAL_ID_TAKEN`: ya existe un cliente con esa cédula para este prestamista. */
export const ClientConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CLIENT_NATIONAL_ID_TAKEN'),
}).meta({ id: 'ClientConflict' });
