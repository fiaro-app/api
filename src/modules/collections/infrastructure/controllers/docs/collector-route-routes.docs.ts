import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { CollectorRouteForbiddenSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-route-errors.schema.js';
import { CollectorRouteResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-route-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'CollectorRouteUnauthenticated' });

/** Documenta `QUERY /collectors/me/route`. */
export const ApiGetCollectorRoute = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver mi ruta del día',
      description:
        'Préstamos ACTIVE que el cobrador de la sesión debe visitar en la fecha pedida (hoy, si no llega), con su saldo y su mora: la unión de sus asignaciones vigentes esa fecha y las visitas que prometió reprogramar para ese día (D-17). Exige rol COLLECTOR en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'La ruta del día, sin paginar.',
      standardSchema: CollectorRouteResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'CollectorRouteValidationError' }),
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `COLLECTOR` (`FORBIDDEN`).',
      standardSchema: CollectorRouteForbiddenSchema,
    }),
  );
