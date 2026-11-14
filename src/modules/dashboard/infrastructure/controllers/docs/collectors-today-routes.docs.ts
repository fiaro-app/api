import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LenderDashboardForbiddenSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-dashboard-errors.schema.js';
import { CollectorsTodayResponseSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/collectors-today-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `GET /lenders/me/collectors-today`. */
export const ApiGetCollectorsToday = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver cómo va la ruta de hoy de cada cobrador',
      description:
        'Por cada cobrador activo: si ya empezó su ruta, cuántos préstamos tiene, cuántos ya visitó y cuántos le faltan, lo esperado y lo cobrado, la hora de su primera y última visita y el estado del cuadre que envió hoy. Más el conteo de cobradores por estado. Exige rol OWNER o LENDER.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'El avance de hoy de todos los cobradores activos.',
      standardSchema: CollectorsTodayResponseSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, o sin rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: LenderDashboardForbiddenSchema,
    }),
  );
