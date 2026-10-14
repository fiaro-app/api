import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  PortfolioConflictSchema,
  PortfolioForbiddenSchema,
  PortfolioNotFoundSchema,
  PortfolioValidationErrorSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-errors.schema.js';
import {
  PortfolioResponseSchema,
  PortfoliosResponseSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'PortfolioUnauthenticated' });

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
    standardSchema: PortfolioForbiddenSchema,
  });

/** El 403 de crear: la membresía activa no tiene rol `OWNER` ni `LENDER`. */
const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    standardSchema: PortfolioForbiddenSchema,
  });

/** El 400 de un cuerpo que no cumple el contrato. */
const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
    standardSchema: PortfolioValidationErrorSchema,
  });

/** El 409 de un nombre repetido dentro del mismo prestamista. */
const ApiNameTakenResponse = () =>
  ApiResponse({
    status: 409,
    description:
      'Ya existe una cartera con ese nombre para este prestamista (`CONFLICT`).',
    standardSchema: PortfolioConflictSchema,
  });

/** Documenta `POST /portfolios`. */
export const ApiCreatePortfolio = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Dar de alta una cartera',
      description:
        'Cartera adicional del prestamista con el que opera la sesión, resuelto por `LenderScopeGuard`. La cartera "General" no se crea aquí: nace con el prestamista. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Cartera creada.',
      standardSchema: PortfolioResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiNameTakenResponse(),
  );

/** Documenta `GET /portfolios`. */
export const ApiListPortfolios = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver las carteras',
      description:
        'Todas las carteras del prestamista con el que opera la sesión, sin paginar. Cualquier rol puede verlas.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Carteras del prestamista.',
      standardSchema: PortfoliosResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
  );

/** El 404 de una ruta con `:id`: la cartera no existe para el prestamista de la sesión. */
const ApiPortfolioNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description:
      'La cartera no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: PortfolioNotFoundSchema,
  });

/** Documenta `PATCH /portfolios/:id`. */
export const ApiUpdatePortfolio = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Renombrar una cartera',
      description:
        'Cambia el nombre de una cartera del prestamista con el que opera la sesión; también la cartera por defecto ("General"). Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cartera con su nombre nuevo.',
      standardSchema: PortfolioResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiPortfolioNotFoundResponse(),
    ApiNameTakenResponse(),
  );

/** Documenta `DELETE /portfolios/:id`. */
export const ApiDeletePortfolio = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Borrar una cartera',
      description:
        'Borra una cartera del prestamista con el que opera la sesión. No se puede borrar la cartera por defecto ("General") ni una que todavía tenga cobradores activos asignados: hay que pasarlos antes a otra cartera. Las membresías inactivas que la tenían quedan sin cartera. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({ status: 204, description: 'Cartera borrada.' }),
    ApiResponse({
      status: 400,
      description: 'El id no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: PortfolioValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiPortfolioNotFoundResponse(),
    ApiResponse({
      status: 409,
      description:
        'Es la cartera por defecto, o tiene cobradores activos asignados (`CONFLICT`).',
      standardSchema: PortfolioConflictSchema,
    }),
  );
