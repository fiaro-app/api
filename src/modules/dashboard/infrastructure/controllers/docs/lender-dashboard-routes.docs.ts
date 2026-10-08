import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import { LenderDashboardResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LenderDashboardUnauthenticated' });

/** Documenta `GET /lenders/me/dashboard`. */
export const ApiGetLenderDashboard = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el resumen del negocio',
      description:
        'Cartera total, cobrado hoy, cobradores activos y totales, efectividad general de hoy, clientes en mora, alertas de texto y los cuadres PENDING por revisar, del prestamista con el que opera la sesión (D-99). Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El resumen del negocio.',
      standardSchema: LenderDashboardResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: LenderDashboardForbiddenSchema,
    }),
  );
