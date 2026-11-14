import { ApiErrorSchema } from '@fiaro-app/contracts';
import { ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  MembershipForbiddenSchema,
  MembershipNotFoundSchema,
  MembershipValidationErrorSchema,
  PlanLimitReachedSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-errors.schema.js';

/** Respuestas de error que comparten las rutas de membresías. */

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'MembershipUnauthenticated' });

/** El 401 de toda ruta protegida: sin sesión vigente. */
export const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

/** El 403 de administrar: la membresía activa no tiene rol `OWNER` ni `LENDER`, o es sobre la propia sesión. */
export const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, la membresía activa no tiene rol `OWNER` ni `LENDER`, o el pedido es sobre la propia membresía de la sesión (`FORBIDDEN`).',
    standardSchema: MembershipForbiddenSchema,
  });

/** El 404 de una ruta con `:id`: la membresía no existe para el prestamista de la sesión. */
export const ApiMembershipNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description:
      'La membresía no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: MembershipNotFoundSchema,
  });

/** El 400 de un cuerpo, roles o cartera que no cumplen el contrato. */
export const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description:
      'El cuerpo no cumple el contrato, los roles no son válidos, o falta la cartera o la cédula que exige `COLLECTOR` (`VALIDATION_FAILED`).',
    standardSchema: MembershipValidationErrorSchema,
  });

/**
 * El 403 de una ruta que suma un cobrador activo: además del rol, el plan puede no tener cupo.
 * Reemplaza a {@link ApiWrongRoleResponse}: dos respuestas con el mismo estado se pisan.
 */
export const ApiWrongRoleOrPlanLimitResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin el rol `OWNER` o `LENDER`, o sobre la propia membresía (`FORBIDDEN`); o el plan ya tiene ocupados todos sus cupos de cobrador (`PLAN_LIMIT_REACHED`, con `maxCollectors`; el dueño no ocupa cupo) o de administrador (`PLAN_LIMIT_REACHED`, con `maxAdmins`; la dueña sí cuenta). `errorCode` distingue: `M003A` cobradores, `M007A` administradores.',
    standardSchema: z.union([
      MembershipForbiddenSchema,
      PlanLimitReachedSchema,
    ]),
  });
