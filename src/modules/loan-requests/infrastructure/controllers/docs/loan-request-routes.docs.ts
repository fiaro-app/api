import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  LoanRequestConflictSchema,
  LoanRequestForbiddenSchema,
  LoanRequestNotFoundSchema,
  LoanRequestValidationErrorSchema,
} from '@/modules/loan-requests/infrastructure/controllers/schemas/loan-request-errors.schema.js';
import {
  ClientLookupResponseSchema,
  LoanRequestResponseSchema,
  LoanRequestsPageResponseSchema,
} from '@/modules/loan-requests/infrastructure/controllers/schemas/loan-request-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LoanRequestUnauthenticated' });

/** El 401 de toda ruta protegida. */
const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

/** El 403 por rol o por falta de membresía activa. */
const ApiForbiddenResponse = (description: string) =>
  ApiResponse({
    status: 403,
    description,
    standardSchema: LoanRequestForbiddenSchema,
  });

/** El 400 de un cuerpo que no cumple el contrato. */
const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
    standardSchema: LoanRequestValidationErrorSchema,
  });

/** Documenta `POST /loan-requests/client-lookup`. */
export const ApiLookupClient = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Saber si una cédula ya es de un cliente del negocio',
      description:
        'Solo responde si existe, sin ningún dato del cliente: así un cobrador sabe si debe registrarlo, sin ver a quien no conoce. Exige rol `COLLECTOR`, `OWNER` o `LENDER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Si la cédula existe en el negocio.',
      standardSchema: ClientLookupResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiForbiddenResponse('Sin ninguna membresía activa (`FORBIDDEN`).'),
  );

/** Documenta `POST /loan-requests`. */
export const ApiCreateLoanRequest = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Sugerir un préstamo al administrador',
      description:
        'Un cobrador propone un préstamo para un cliente nuevo (con sus datos) o uno que el negocio ya tiene (solo la cédula). Queda `PENDING` y se avisa a los administradores por notificación y push. Exige rol `COLLECTOR`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Solicitud creada.',
      standardSchema: LoanRequestResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiForbiddenResponse(
      'La membresía activa no tiene rol `COLLECTOR` (`FORBIDDEN`).',
    ),
  );

/** Documenta `QUERY /loan-requests`. */
export const ApiListLoanRequests = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar solicitudes de préstamo',
      description:
        'El administrador (`OWNER` o `LENDER`) ve las de todos los cobradores; un cobrador, solo las suyas. Paginadas, de la más nueva a la más antigua, con filtro opcional por estado.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de solicitudes.',
      standardSchema: LoanRequestsPageResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiForbiddenResponse('Sin ninguna membresía activa (`FORBIDDEN`).'),
  );

/** Documenta `GET /loan-requests/:id`. */
export const ApiGetLoanRequest = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver una solicitud de préstamo',
      description:
        'El administrador (`OWNER` o `LENDER`) ve cualquiera del negocio; un cobrador, solo las suyas (de otro es `404`).',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'La solicitud.',
      standardSchema: LoanRequestResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiForbiddenResponse('Sin ninguna membresía activa (`FORBIDDEN`).'),
    ApiResponse({
      status: 404,
      description:
        'La solicitud no existe para este prestamista, o es de otro cobrador (`NOT_FOUND`).',
      standardSchema: LoanRequestNotFoundSchema,
    }),
  );

/** Documenta `POST /loan-requests/:id/approve`. */
export const ApiApproveLoanRequest = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Aceptar una solicitud de préstamo',
      description:
        'Crea el cliente (si era nuevo), el préstamo y su asignación al cobrador que la hizo, con los ajustes opcionales del cuerpo, y le avisa. Exige rol `OWNER` o `LENDER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Solicitud aceptada, con el préstamo creado.',
      standardSchema: LoanRequestResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiForbiddenResponse(
      'La membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    ),
    ApiResponse({
      status: 404,
      description:
        'La solicitud no existe para este prestamista (`NOT_FOUND`).',
      standardSchema: LoanRequestNotFoundSchema,
    }),
    ApiResponse({
      status: 409,
      description:
        'La solicitud ya fue resuelta, o la cédula del cliente nuevo ya existe (`CONFLICT`).',
      standardSchema: LoanRequestConflictSchema,
    }),
  );

/** Documenta `POST /loan-requests/:id/reject`. */
export const ApiRejectLoanRequest = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Rechazar una solicitud de préstamo',
      description:
        'La descarta y le avisa al cobrador, con el motivo si lo escribió. Exige rol `OWNER` o `LENDER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Solicitud rechazada.',
      standardSchema: LoanRequestResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiForbiddenResponse(
      'La membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    ),
    ApiResponse({
      status: 404,
      description:
        'La solicitud no existe para este prestamista (`NOT_FOUND`).',
      standardSchema: LoanRequestNotFoundSchema,
    }),
    ApiResponse({
      status: 409,
      description: 'La solicitud ya fue resuelta (`CONFLICT`).',
      standardSchema: LoanRequestConflictSchema,
    }),
  );
