import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CollectionVisitReportForbiddenSchema,
  CollectionVisitReportValidationErrorSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-report-errors.schema.js';
import {
  CollectionRoutesResponseSchema,
  CollectionVisitReportResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-report-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'CollectionVisitReportUnauthenticated' });

/** Documenta `QUERY /collection-visits`. */
export const ApiSearchCollectionVisits = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'Buscar las visitas de cobro de todo el negocio («Cobros del día»)',
      description:
        'Las visitas de todos los cobradores del prestamista, paginadas y de la más reciente a la más antigua, cada una con su préstamo, cliente, cobrador, cuota esperada y pago (monto y medio). Sin `dateRange`, las de hoy. Filtros combinables por cobrador, cartera y resultado. Solo `OWNER` o `LENDER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de visitas y el rango consultado.',
      standardSchema: CollectionVisitReportResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'Algún filtro no es válido (`VALIDATION_FAILED`).',
      standardSchema: CollectionVisitReportValidationErrorSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin membresía activa con un prestamista, o sin rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: CollectionVisitReportForbiddenSchema,
    }),
  );

/** Documenta `QUERY /collection-visits/routes`. */
export const ApiSearchCollectionRoutes = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el registro de rutas (un renglón por cobrador y día)',
      description:
        'Para cada cobrador y día con visitas: cuándo empezó la ruta (su primera visita), cuándo terminó (la última), cuántas visitas hizo, cuántas terminaron en pago, lo que se esperaba cobrar y lo que cobró (sin los pagos revertidos). Paginado, del día más reciente al más antiguo. Sin `dateRange`, hoy. Filtros combinables por cobrador y cartera. El detalle de cada visita sale de `QUERY /collection-visits` con el mismo día y cobrador. Solo `OWNER` o `LENDER`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página del registro de rutas y el rango consultado.',
      standardSchema: CollectionRoutesResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'Algún filtro no es válido (`VALIDATION_FAILED`).',
      standardSchema: CollectionVisitReportValidationErrorSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin membresía activa con un prestamista, o sin rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
      standardSchema: CollectionVisitReportForbiddenSchema,
    }),
  );
