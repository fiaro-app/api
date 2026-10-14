import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  SettlementConflictSchema,
  SettlementForbiddenSchema,
  SettlementNotFoundSchema,
  SettlementValidationErrorSchema,
} from '@/modules/settlements/infrastructure/controllers/schemas/settlement-errors.schema.js';
import {
  SettlementResponseSchema,
  SettlementsPageResponseSchema,
} from '@/modules/settlements/infrastructure/controllers/schemas/settlement-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'SettlementUnauthenticated' });

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
    standardSchema: SettlementForbiddenSchema,
  });

/** El 404 de un cuadre que no existe para el prestamista de la sesión. */
const ApiNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description: 'El cuadre no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: SettlementNotFoundSchema,
  });

/** Documenta `POST /daily-settlements`. */
export const ApiSubmitSettlement = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cerrar el día (cuadre)',
      description:
        'Crea el cuadre de hoy del cobrador de la sesión, o lo reemplaza y lo devuelve a `PENDING` si ya lo había enviado. Los montos son los que declara el cobrador: Fiaro no los recalcula contra sus visitas del día. Exige rol `COLLECTOR` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cuadre creado o reemplazado.',
      standardSchema: SettlementResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'El cuerpo no cumple el contrato, o falta `collectorNote` porque lo cobrado difiere de lo esperado (`VALIDATION_FAILED`).',
      standardSchema: SettlementValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `COLLECTOR` (`FORBIDDEN`).',
      standardSchema: SettlementForbiddenSchema,
    }),
  );

/** Documenta `GET /daily-settlements/:id`. */
export const ApiGetSettlement = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver un cuadre',
      description:
        'Un cuadre del prestamista con el que opera la sesión. Cualquier rol puede verlo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Datos públicos del cuadre.',
      standardSchema: SettlementResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El id no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: SettlementValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
    ApiNotFoundResponse(),
  );

/** Documenta `QUERY /daily-settlements`. */
export const ApiListSettlements = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar cuadres',
      description:
        'Cuadres del prestamista con el que opera la sesión, de la fecha más reciente a la más antigua, paginados y con filtros opcionales y combinables por cobrador, cartera, estado y rango de fechas (`dateRange`, sobre la fecha del cuadre). Cualquier rol puede verla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de cuadres.',
      standardSchema: SettlementsPageResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
  );

/**
 * Documenta `POST /daily-settlements/:id/approve` y `POST /daily-settlements/:id/reject`.
 *
 * @param action - `'approve'` o `'reject'`, para el texto de cada ruta.
 */
export const apiReviewSettlement = (action: 'approve' | 'reject') =>
  applyDecorators(
    ApiOperation({
      summary:
        action === 'approve' ? 'Aprobar un cuadre' : 'Rechazar un cuadre',
      description:
        'Solo mientras el cuadre sigue `PENDING`: si el cobrador lo reenvía, vuelve a `PENDING` para un ciclo de revisión nuevo. El rechazo es informativo, no bloquea la ruta del cobrador. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cuadre revisado.',
      standardSchema: SettlementResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: SettlementValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: SettlementForbiddenSchema,
    }),
    ApiNotFoundResponse(),
    ApiResponse({
      status: 409,
      description: 'Ese cuadre ya se revisó (`CONFLICT`).',
      standardSchema: SettlementConflictSchema,
    }),
  );
