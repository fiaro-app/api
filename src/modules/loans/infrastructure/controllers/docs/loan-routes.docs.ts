import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  LoanForbiddenSchema,
  LoanNotFoundSchema,
  LoanValidationErrorSchema,
} from '@/modules/loans/infrastructure/controllers/schemas/loan-errors.schema.js';
import {
  LoanResponseSchema,
  LoansPageResponseSchema,
} from '@/modules/loans/infrastructure/controllers/schemas/loan-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LoanUnauthenticated' });

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
    standardSchema: LoanForbiddenSchema,
  });

/** El 403 de dar de alta: la membresía activa no tiene rol `OWNER` ni `LENDER`. */
const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    standardSchema: LoanForbiddenSchema,
  });

/** El 400 de un cuerpo que no cumple el contrato. */
const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
    standardSchema: LoanValidationErrorSchema,
  });

/** El 404 de un préstamo, o un cliente, que no existe para el prestamista de la sesión. */
const ApiNotFoundResponse = (description: string) =>
  ApiResponse({ status: 404, description, standardSchema: LoanNotFoundSchema });

/** Documenta `POST /loans`. */
export const ApiCreateLoan = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Dar de alta un préstamo',
      description:
        'Acuerdo de pago para un cliente del prestamista con el que opera la sesión, resuelto por `LenderScopeGuard`. Nace `ACTIVE`. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Préstamo creado.',
      standardSchema: LoanResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiNotFoundResponse(
      'El cliente no existe, o es de otro prestamista (`NOT_FOUND`).',
    ),
  );

/** Documenta `GET /loans/:id`. */
export const ApiGetLoan = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver un préstamo',
      description:
        'Un préstamo del prestamista con el que opera la sesión. Cualquier rol puede verlo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Datos públicos del préstamo.',
      standardSchema: LoanResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
    ApiNotFoundResponse(
      'El préstamo no existe, o es de otro prestamista (`NOT_FOUND`).',
    ),
  );

/** Documenta `QUERY /loans`. */
export const ApiListLoans = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar préstamos',
      description:
        'Préstamos del prestamista con el que opera la sesión, paginados y con filtro opcional por cliente o estado. Cualquier rol puede verla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de préstamos.',
      standardSchema: LoansPageResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
  );
