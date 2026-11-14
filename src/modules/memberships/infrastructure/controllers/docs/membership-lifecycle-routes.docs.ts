import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  ApiMembershipNotFoundResponse,
  ApiUnauthenticatedResponse,
  ApiWrongRoleOrPlanLimitResponse,
  ApiWrongRoleResponse,
} from '@/modules/memberships/infrastructure/controllers/docs/membership-common-responses.docs.js';
import {
  CollectorHasHistorySchema,
  MembershipValidationErrorSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-errors.schema.js';
import { MembershipResponseSchema } from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `POST /memberships/:id/reactivate`. */
export const ApiReactivateMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Reactivar una membresía',
      description:
        'Devuelve el acceso a un colaborador dado de baja, con los mismos roles y cartera; su historial sigue intacto y no recupera préstamos (se reasignan aparte). Idempotente: reactivar una `ACTIVE` devuelve la membresía tal como está. Si vuelve como cobrador ocupa un cupo del plan. Nadie puede reactivarse a sí mismo. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Membresía activa.',
      standardSchema: MembershipResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleOrPlanLimitResponse(),
    ApiMembershipNotFoundResponse(),
  );

/** Documenta `DELETE /memberships/:id`. */
export const ApiDeleteMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Borrar una membresía registrada por error',
      description:
        'Borrado definitivo, solo para una membresía que nunca tuvo asignaciones de cobro, visitas ni cuadres. Con historial responde `409 COLLECTOR_HAS_HISTORY`: se da de baja, que lo conserva. La membresía del dueño no se borra. La cuenta de la persona no se toca (puede trabajar para otro negocio). Exige rol `OWNER` o `LENDER`, y nunca sobre la propia membresía.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({ status: 204, description: 'Membresía borrada.' }),
    ApiResponse({
      status: 400,
      description: 'Es la membresía del dueño (`VALIDATION_FAILED`).',
      standardSchema: MembershipValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiMembershipNotFoundResponse(),
    ApiResponse({
      status: 409,
      description: 'Tiene historial (`COLLECTOR_HAS_HISTORY`).',
      standardSchema: CollectorHasHistorySchema,
    }),
  );
