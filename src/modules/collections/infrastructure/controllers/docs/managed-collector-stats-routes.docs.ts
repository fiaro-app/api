import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { CollectorStatsForbiddenSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-errors.schema.js';
import { CollectorPeriodStatsResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `GET /collectors/:id/stats`. */
export const ApiGetManagedCollectorStats = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver las estadísticas de un cobrador',
      description:
        'Desempeño de un cobrador del prestamista en un período (el mes actual, si no llegan `from` y `to`): efectividad de cobro, lo cobrado, cuántas visitas hizo y la mora de los préstamos que tiene asignados hoy. Es la misma cifra que el cobrador ve de sí mismo en `QUERY /collectors/me/stats` (D-98). Un cobrador dado de baja también se puede consultar. Exige rol `OWNER` o `LENDER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Sus estadísticas del período.',
      standardSchema: CollectorPeriodStatsResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'El id no es un UUID, o el período no es válido (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'ManagedCollectorStatsValidationError' }),
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('UNAUTHENTICATED'),
      }).meta({ id: 'ManagedCollectorStatsUnauthenticated' }),
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: CollectorStatsForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description:
        'La membresía no existe, es de otro prestamista, o no es de un cobrador (`NOT_FOUND`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('NOT_FOUND'),
      }).meta({ id: 'ManagedCollectorStatsNotFound' }),
    }),
  );
