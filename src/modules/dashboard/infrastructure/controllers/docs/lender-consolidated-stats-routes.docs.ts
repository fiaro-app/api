import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import { ConsolidatedStatsResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-consolidated-stats.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `QUERY /lenders/me/consolidated-stats`. */
export const ApiGetConsolidatedStats = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver las cifras de todos tus negocios juntas',
      description:
        'Cartera, cartera en riesgo, mora, lo esperado y lo cobrado del período, por cada negocio que la persona administra (rol OWNER o LENDER) dentro del mismo Tenant, y el total (D-155). Solo en planes con estadísticas consolidadas (Team y la prueba): en Individual y Pro responde `403 PLAN_FEATURE_UNAVAILABLE`. Exige rol OWNER o LENDER en el negocio de la sesión.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El consolidado del período.',
      standardSchema: ConsolidatedStatsResponseSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin membresía activa o sin rol `OWNER`/`LENDER` (`FORBIDDEN`), o el plan no trae la función (`PLAN_FEATURE_UNAVAILABLE`).',
      standardSchema: LenderDashboardForbiddenSchema,
    }),
  );
