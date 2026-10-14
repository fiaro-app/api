import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import {
  CollectorPerformancePageResponseSchema,
  TopArrearsPageResponseSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-lists.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Errores comunes de las dos listas: cuerpo inválido, sin sesión y sin rol. */
const ApiStatsListErrors = (id: string) => [
  ApiResponse({
    status: 400,
    description:
      'Paginación fuera de rango (más de 50 por página), un id que no es UUID o un período inválido: al revés, posterior a hoy o de más de 366 días (`VALIDATION_FAILED`).',
    standardSchema: ApiErrorSchema.extend({
      code: z.literal('VALIDATION_FAILED'),
    }).meta({ id: `${id}ValidationError` }),
  }),
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: ApiErrorSchema.extend({
      code: z.literal('UNAUTHENTICATED'),
    }).meta({ id: `${id}Unauthenticated` }),
  }),
  ApiResponse({
    status: 403,
    description:
      'La membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    standardSchema: LenderDashboardForbiddenSchema,
  }),
];

/** Documenta `QUERY /lenders/me/stats/top-arrears`. */
export const ApiListTopArrears = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el ranking completo de mayor mora',
      description:
        'Los clientes con mora de hoy, de más días de atraso a menos y luego de más monto a menos, paginados (10 por defecto, máximo 50). `QUERY /lenders/me/stats` trae solo los 5 primeros. Mismos filtros de cobrador y cartera. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Una página del ranking.',
      standardSchema: TopArrearsPageResponseSchema,
    }),
    ...ApiStatsListErrors('TopArrears'),
  );

/** Documenta `QUERY /lenders/me/stats/collector-performance`. */
export const ApiListCollectorPerformance = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el desempeño de todos los cobradores',
      description:
        'Efectividad del período y mora de hoy de cada cobrador activo, del más antiguo al más nuevo, paginados (10 por defecto, máximo 50). Las métricas se calculan solo para los cobradores de la página. `QUERY /lenders/me/stats` trae solo los 5 primeros. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Una página del desempeño.',
      standardSchema: CollectorPerformancePageResponseSchema,
    }),
    ...ApiStatsListErrors('CollectorPerformance'),
  );
