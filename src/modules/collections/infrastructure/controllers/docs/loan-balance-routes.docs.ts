import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  LoanBalanceForbiddenSchema,
  LoanBalanceNotFoundSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/loan-balance-errors.schema.js';
import { LoanBalanceResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/loan-balance-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'LoanBalanceUnauthenticated' });

/** Documenta `GET /loans/:loanId/balance`. */
export const ApiGetLoanBalance = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el saldo y la mora de un préstamo',
      description:
        'Saldo, mora y próxima fecha esperada, calculados con la fecha de hoy desde la frecuencia del préstamo y los días sin cobro del prestamista. Cualquier rol puede verlo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Estado financiero del préstamo.',
      standardSchema: LoanBalanceResponseSchema,
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
