import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import { LenderDashboardResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-responses.schema.js';
import { LenderPeriodStatsResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LenderDashboardUnauthenticated' });

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
      'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    standardSchema: LenderDashboardForbiddenSchema,
  });

/** Documenta `GET /lenders/me/dashboard`. */
export const ApiGetLenderDashboard = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el resumen del negocio',
      description:
        'Cartera total, cobrado hoy, cobradores activos y totales, efectividad general de hoy, clientes en mora, alertas de texto y los cuadres PENDING por revisar, del prestamista con el que opera la sesión (D-99). Con `from` y `to` (hora de Colombia; ausentes: solo hoy) suma también lo cobrado y lo esperado de ese período (`collectedInPeriod`, `expectedInPeriod`, `effectivenessInPeriod`); la cartera, la mora, las alertas y los cuadres siguen siendo los de este momento. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El resumen del negocio.',
      standardSchema: LenderDashboardResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'El período no es válido: una fecha mal formada, o `to` anterior a `from` (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'LenderDashboardValidationError' }),
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
  );

/** Documenta `QUERY /lenders/me/stats`. */
export const ApiGetLenderStats = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver las estadísticas del negocio',
      description:
        'Salud de cartera y mora del prestamista con el que opera la sesión en un período (el mes actual, si no llega uno): cartera en riesgo, % en mora, mora por antigüedad (4 buckets fijos), el ranking de clientes con mayor mora y el desempeño de cada cobrador (D-100). Filtrable por cobrador y por cartera, combinables entre sí. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Las estadísticas del período.',
      standardSchema: LenderPeriodStatsResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'LenderStatsValidationError' }),
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
  );

/** Documenta `QUERY /lenders/me/stats/export`. */
export const ApiGetLenderStatsExport = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Exportar las estadísticas del negocio en PDF',
      description:
        'El mismo reporte de `QUERY /lenders/me/stats`, en un PDF de una página (D-101). Mismos filtros, más `format: "pdf"`. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El PDF del reporte.',
      content: {
        'application/pdf': { schema: { type: 'string', format: 'binary' } },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'LenderStatsExportValidationError' }),
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
  );
