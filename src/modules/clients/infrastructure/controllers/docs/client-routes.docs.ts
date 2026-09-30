import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  ClientConflictSchema,
  ClientForbiddenSchema,
  ClientNotFoundSchema,
  ClientValidationErrorSchema,
} from '@/modules/clients/infrastructure/controllers/schemas/client-errors.schema.js';
import {
  ClientResponseSchema,
  ClientsPageResponseSchema,
} from '@/modules/clients/infrastructure/controllers/schemas/client-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'ClientUnauthenticated' });

/** El 401 de toda ruta protegida: sin sesión vigente. */
const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

/** El 403 de `LenderScopeGuard`: sin ninguna membresía activa. */
const ApiNoActiveMembershipResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'La sesión no tiene ninguna membresía activa con un prestamista (`FORBIDDEN`).',
    standardSchema: ClientForbiddenSchema,
  });

/** El 403 de crear o editar: la membresía activa no tiene rol `OWNER` ni `LENDER`. */
const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    standardSchema: ClientForbiddenSchema,
  });

/** El 404 de una ruta con `:id`: el cliente no existe para el prestamista de la sesión. */
const ApiClientNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description:
      'El cliente no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: ClientNotFoundSchema,
  });

/** El 400 de un cuerpo que no cumple el contrato. */
const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
    standardSchema: ClientValidationErrorSchema,
  });

/** El 409 de una cédula repetida dentro del mismo prestamista. */
const ApiNationalIdTakenResponse = () =>
  ApiResponse({
    status: 409,
    description:
      'Ya existe un cliente con esa cédula para este prestamista (`CLIENT_NATIONAL_ID_TAKEN`).',
    standardSchema: ClientConflictSchema,
  });

/** Documenta `POST /clients`. */
export const ApiCreateClient = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Dar de alta a un cliente',
      description:
        'Persona deudora del prestamista con el que opera la sesión, resuelto por `LenderScopeGuard`. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Cliente creado.',
      standardSchema: ClientResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiNationalIdTakenResponse(),
  );

/** Documenta `GET /clients/:id`. */
export const ApiGetClient = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver un cliente',
      description:
        'Un cliente del prestamista con el que opera la sesión. Cualquier rol puede verlo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Datos públicos del cliente.',
      standardSchema: ClientResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
    ApiClientNotFoundResponse(),
  );

/** Documenta `QUERY /clients`. */
export const ApiListClients = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar clientes',
      description:
        'Clientes del prestamista con el que opera la sesión, paginados y con búsqueda opcional por nombre o cédula. Cualquier rol puede verla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de clientes.',
      standardSchema: ClientsPageResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
  );

/** Documenta `PATCH /clients/:id`. */
export const ApiUpdateClient = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Actualizar un cliente',
      description:
        'Un campo ausente no se toca. El resultado completo se revalida con el mismo contrato del alta (`ClientSchema`). Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cliente actualizado.',
      standardSchema: ClientResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiClientNotFoundResponse(),
    ApiNationalIdTakenResponse(),
  );
