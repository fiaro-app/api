import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import { LenderInsightsResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-insights-schemas.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `QUERY /lenders/me/stats/insights`. */
export const ApiGetLenderInsights = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'Ver cómo va el negocio: cobro, ganancia, colocación y operación',
      description:
        'La serie diaria de lo cobrado contra lo que vencía, cuánto de lo cobrado es interés (ganancia) y cuánto capital que regresa, lo cobrado por medio de pago, los préstamos nuevos y el capital prestado, la mezcla de resultados de las visitas (cuántas encontraron al cliente y cuántas terminaron en pago), los cuadres que no cuadraron con lo que faltó y sobró, y lo que vence en los próximos 7 días. Incluye el período anterior de la misma duración para la tendencia (D-133). Exige rol OWNER o LENDER. Solo en planes con estadísticas avanzadas (Pro, Team y la prueba): en Individual responde `403 PLAN_FEATURE_UNAVAILABLE` (D-151).',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Las estadísticas del período.',
      standardSchema: LenderInsightsResponseSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o sin rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: LenderDashboardForbiddenSchema,
    }),
  );
