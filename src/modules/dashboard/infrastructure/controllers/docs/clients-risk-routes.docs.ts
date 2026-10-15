import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientsRiskResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/clients-risk-schemas.js';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `QUERY /lenders/me/clients/risk`. */
export const ApiGetClientsRisk = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el riesgo de varios clientes del negocio',
      description:
        'Un puntaje de 0 a 100, su nivel (bajo, medio, alto, muy alto) y los factores que lo explican, calculados solo con el historial del cliente en este negocio: su mora de hoy, si tiene varios préstamos en mora y los que ya pagó (D-137). Hasta 50 clientes por consulta. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El riesgo de cada cliente pedido, en el mismo orden.',
      standardSchema: ClientsRiskResponseSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o sin rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: LenderDashboardForbiddenSchema,
    }),
  );
