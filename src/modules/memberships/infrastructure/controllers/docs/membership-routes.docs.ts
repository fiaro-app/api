import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  ApiMembershipNotFoundResponse,
  ApiUnauthenticatedResponse,
  ApiValidationFailedResponse,
  ApiWrongRoleOrPlanLimitResponse,
  ApiWrongRoleResponse,
} from '@/modules/memberships/infrastructure/controllers/docs/membership-common-responses.docs.js';
import {
  CollaboratorNationalIdTakenSchema,
  MembershipConflictSchema,
  MembershipForbiddenSchema,
  MembershipValidationErrorSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-errors.schema.js';
import {
  InvitedMembershipResponseSchema,
  MembershipListEntryResponseSchema,
  MembershipResponseSchema,
  MembershipsPageResponseSchema,
  ResetMembershipPasswordResponseSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `QUERY /memberships`. */
export const ApiListMemberships = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar colaboradores',
      description:
        'Colaboradores (cobradores y prestamistas) del prestamista con el que opera la sesión, paginados, con nombre y celular de cada uno. Filtro opcional por estado y por rol. Exige rol `OWNER` o `LENDER` en la membresía activa, mismo criterio que administrarlas.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de colaboradores.',
      standardSchema: MembershipsPageResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: MembershipForbiddenSchema,
    }),
  );

/** Documenta `GET /memberships/:id`. */
export const ApiGetMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver un colaborador',
      description:
        'El detalle de un colaborador del prestamista con el que opera la sesión, con la misma forma que cada fila de `QUERY /memberships` (incluye nombre y celular). Puede ser la propia membresía de la sesión. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El colaborador.',
      standardSchema: MembershipListEntryResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El id no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: MembershipValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: MembershipForbiddenSchema,
    }),
    ApiMembershipNotFoundResponse(),
  );

/** Documenta `POST /memberships`. */
export const ApiInviteMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Invitar a un colaborador',
      description:
        'Si el celular ya tiene cuenta, solo se agrega la membresía (esa persona puede trabajar para más de un prestamista) y `tempPassword` sale `null`. Si no, el backend crea la cuenta con una contraseña temporal, que se muestra una sola vez en `tempPassword` para pasarla por WhatsApp (PRODUCT.md §5). Si un alta anterior se cayó a medias (la cuenta existe sin ninguna membresía y sin estrenar), se completa y `tempPassword` trae una contraseña temporal nueva. La cédula es única dentro del negocio, no en todo el sistema. Si la persona ocupa un cupo de cobrador (tiene `COLLECTOR` y no `OWNER`), el plan debe tener cupo; dos altas simultáneas no pueden pasarse del límite. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Membresía creada.',
      standardSchema: InvitedMembershipResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleOrPlanLimitResponse(),
    ApiResponse({
      status: 409,
      description:
        'Esa persona ya tiene una membresía con este prestamista (`CONFLICT`), u otra persona del negocio ya tiene esa cédula (`COLLABORATOR_NATIONAL_ID_TAKEN`; la regla es por prestamista: la misma persona puede trabajar para otro).',
      standardSchema: z.union([
        MembershipConflictSchema,
        CollaboratorNationalIdTakenSchema,
      ]),
    }),
  );

/** Documenta `POST /memberships/:id/deactivate`. */
export const ApiDeactivateMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Desactivar una membresía',
      description:
        'Baja lógica: quita el acceso de inmediato sin borrar el historial. Idempotente: desactivar una que ya está `INACTIVE` no falla, devuelve la membresía tal como está. Rechaza una membresía con el rol `COLLECTOR`: se da de baja con `POST /collectors/:id/deactivate`, que antes reasigna sus préstamos (D-97). Nadie puede desactivar su propia membresía por esta ruta. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Membresía desactivada.',
      standardSchema: MembershipResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'La membresía tiene el rol `COLLECTOR`: se da de baja con `POST /collectors/:id/deactivate` (`VALIDATION_FAILED`).',
      standardSchema: MembershipValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiMembershipNotFoundResponse(),
  );

/** Documenta `POST /memberships/:id/reset-password`. */
export const ApiResetMembershipPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Restablecer la contraseña de un colaborador',
      description:
        'Genera una contraseña temporal nueva, que se muestra una sola vez en `tempPassword` para pasarla por WhatsApp (mismo criterio que invitar, PROTOTIPO-FLUJOS.md §4.7), y revoca todas sus sesiones. Nadie puede restablecerse la contraseña a sí mismo por esta ruta: ya tiene `/auth/change-password`. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Contraseña temporal nueva.',
      standardSchema: ResetMembershipPasswordResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiMembershipNotFoundResponse(),
  );

/** Documenta `PATCH /memberships/:id/roles`. */
export const ApiChangeMembershipRoles = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cambiar los roles de una membresía',
      description:
        'Si los roles nuevos no incluyen `COLLECTOR`, la cartera se limpia. Si la incluyen, usa la cartera del pedido o, si no llega ninguna, la que ya tenía. Nadie puede cambiarse los roles a sí mismo por esta ruta. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Membresía con sus roles ya actualizados.',
      standardSchema: MembershipResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleOrPlanLimitResponse(),
    ApiMembershipNotFoundResponse(),
  );
