import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { CollectorStatsForbiddenSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-errors.schema.js';
import {
  CollectorDailySummaryResponseSchema,
  CollectorPeriodStatsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'CollectorStatsUnauthenticated' });

const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, o la membresía activa no tiene rol `COLLECTOR` (`FORBIDDEN`).',
    standardSchema: CollectorStatsForbiddenSchema,
  });

/** Documenta `QUERY /collectors/me/daily-summary`. */
export const ApiGetCollectorDailySummary = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver mi resumen del día',
      description:
        'Lo que el cobrador de la sesión esperaba cobrar en la fecha pedida (hoy, si no llega) y lo que de verdad cobró, con el historial de sus visitas — para revisar antes de confirmar el cuadre del día (D-98). Exige rol COLLECTOR en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El resumen del día.',
      standardSchema: CollectorDailySummaryResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'CollectorDailySummaryValidationError' }),
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
  );

/** Documenta `QUERY /collectors/me/stats`. */
export const ApiGetCollectorStats = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver mis estadísticas',
      description:
        'Desempeño del cobrador de la sesión en un período (el mes actual, si no llega uno): efectividad de cobro, lo cobrado, cuántas visitas hizo y la mora de los préstamos que tiene asignados hoy (D-98). Misma forma que `QUERY /lenders/me/stats` ve sobre él, pero para su propia cartera. Exige rol COLLECTOR en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Sus estadísticas del período.',
      standardSchema: CollectorPeriodStatsResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'CollectorStatsValidationError' }),
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
  );
