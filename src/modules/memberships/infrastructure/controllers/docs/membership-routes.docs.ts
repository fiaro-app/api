import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  MembershipConflictSchema,
  MembershipForbiddenSchema,
  MembershipNotFoundSchema,
  MembershipValidationErrorSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-errors.schema.js';
import {
  InvitedMembershipResponseSchema,
  MembershipResponseSchema,
  MembershipsPageResponseSchema,
} from '@/modules/memberships/infrastructure/controllers/schemas/membership-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'MembershipUnauthenticated' });

/** El 401 de toda ruta protegida: sin sesión vigente. */
const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

/** El 403 de administrar: la membresía activa no tiene rol `OWNER` ni `LENDER`, o es sobre la propia sesión. */
const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, la membresía activa no tiene rol `OWNER` ni `LENDER`, o el pedido es sobre la propia membresía de la sesión (`FORBIDDEN`).',
    standardSchema: MembershipForbiddenSchema,
  });

/** El 404 de una ruta con `:id`: la membresía no existe para el prestamista de la sesión. */
const ApiMembershipNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description:
      'La membresía no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: MembershipNotFoundSchema,
  });

/** El 400 de un cuerpo, roles o cartera que no cumplen el contrato. */
const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description:
      'El cuerpo no cumple el contrato, los roles no son válidos, o falta la cartera o la cédula que exige `COLLECTOR` (`VALIDATION_FAILED`).',
    standardSchema: MembershipValidationErrorSchema,
  });

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

/** Documenta `POST /memberships`. */
export const ApiInviteMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Invitar a un colaborador',
      description:
        'Si el celular ya tiene cuenta, solo se agrega la membresía (esa persona puede trabajar para más de un prestamista) y `tempPassword` sale `null`. Si no, el backend crea la cuenta con una contraseña temporal, que se muestra una sola vez en `tempPassword` para pasarla por WhatsApp (PRODUCT.md §5). Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Membresía creada.',
      standardSchema: InvitedMembershipResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiResponse({
      status: 409,
      description:
        'Esa persona ya tiene una membresía con este prestamista (`CONFLICT`).',
      standardSchema: MembershipConflictSchema,
    }),
  );

/** Documenta `POST /memberships/:id/deactivate`. */
export const ApiDeactivateMembership = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Desactivar una membresía',
      description:
        'Baja lógica: quita el acceso de inmediato sin borrar el historial. Idempotente: desactivar una que ya está `INACTIVE` no falla, devuelve la membresía tal como está. Nadie puede desactivar su propia membresía por esta ruta. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Membresía desactivada.',
      standardSchema: MembershipResponseSchema,
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
    ApiWrongRoleResponse(),
    ApiMembershipNotFoundResponse(),
  );
