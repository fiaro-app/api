import { ApiErrorSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** `400 VALIDATION_FAILED`: el cuerpo, los roles o la cartera no cumplen el contrato. */
export const MembershipValidationErrorSchema = ApiErrorSchema.extend({
  code: z.literal('VALIDATION_FAILED'),
}).meta({ id: 'MembershipValidationError' });

/** `403 FORBIDDEN`: sin membresía activa, sin el rol para administrar, o sobre la propia sesión. */
export const MembershipForbiddenSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'MembershipForbidden' });

/** `404 NOT_FOUND`: la membresía no existe para el prestamista de la sesión. */
export const MembershipNotFoundSchema = ApiErrorSchema.extend({
  code: z.literal('NOT_FOUND'),
}).meta({ id: 'MembershipNotFound' });

/** `409 CONFLICT`: esa persona ya tiene una membresía con este prestamista. */
export const MembershipConflictSchema = ApiErrorSchema.extend({
  code: z.literal('CONFLICT'),
}).meta({ id: 'MembershipConflict' });

/** `409 COLLABORATOR_NATIONAL_ID_TAKEN`: otra persona del negocio ya tiene esa cédula. */
export const CollaboratorNationalIdTakenSchema = ApiErrorSchema.extend({
  code: z.literal('COLLABORATOR_NATIONAL_ID_TAKEN'),
}).meta({ id: 'CollaboratorNationalIdTaken' });

/** `403 PLAN_LIMIT_REACHED`: el plan ya tiene ocupados todos sus cupos de cobrador o de administrador. */
export const PlanLimitReachedSchema = ApiErrorSchema.extend({
  code: z.literal('PLAN_LIMIT_REACHED'),
}).meta({ id: 'PlanLimitReached' });

/** `409 COLLECTOR_HAS_HISTORY`: la membresía tiene historial; se da de baja en lugar de borrarla. */
export const CollectorHasHistorySchema = ApiErrorSchema.extend({
  code: z.literal('COLLECTOR_HAS_HISTORY'),
}).meta({ id: 'CollectorHasHistory' });
