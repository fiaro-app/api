import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  LoanBalanceForbiddenSchema,
  LoanBalanceNotFoundSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/loan-balance-errors.schema.js';
import { LoanInstallmentsResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/loan-installments-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LoanInstallmentsUnauthenticated' });

/** Documenta `GET /loans/:loanId/installments`. */
export const ApiGetLoanInstallments = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el calendario de cuotas de un préstamo',
      description:
        'Una fila por cuota con su fecha, lo esperado, lo pagado y su estado (`PAID`, `PARTIAL`, `OVERDUE` o `PENDING`). Sale del mismo motor que el saldo y la mora: los pagos se imputan de la cuota más antigua a la más nueva. Cualquier rol puede verlo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Calendario de cuotas del préstamo.',
      standardSchema: LoanInstallmentsResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'La sesión no tiene ninguna membresía activa con un prestamista (`FORBIDDEN`).',
      standardSchema: LoanBalanceForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description:
        'El préstamo no existe, o es de otro prestamista (`NOT_FOUND`).',
      standardSchema: LoanBalanceNotFoundSchema,
    }),
  );
