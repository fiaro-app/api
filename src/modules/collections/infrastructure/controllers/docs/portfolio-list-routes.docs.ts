import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { ClientListResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/client-list-responses.schema.js';
import { LoanListResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/loan-list-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'PortfolioListUnauthenticated' });

/** `403 FORBIDDEN`: sin ninguna membresía activa. */
const ForbiddenErrorSchema = ApiErrorSchema.extend({
  code: z.literal('FORBIDDEN'),
}).meta({ id: 'PortfolioListForbidden' });

const ApiCommonErrors = () =>
  applyDecorators(
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'La sesión no tiene ninguna membresía activa con un prestamista (`FORBIDDEN`).',
      standardSchema: ForbiddenErrorSchema,
    }),
  );

/** Documenta `QUERY /loans`. */
export const ApiListLoansWithBalance = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar préstamos',
      description:
        'Préstamos del prestamista con el que opera la sesión, paginados y con filtro opcional por cliente o estado. Cada fila trae su saldo, su mora (`overdueAmount`, `overdueDays`), la próxima fecha esperada y el cobrador que lo tiene hoy, calculados con el mismo motor que `GET /loans/:loanId/balance`: no hace falta pedir el saldo préstamo por préstamo. Cualquier rol puede verla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de préstamos con su saldo y su mora.',
      standardSchema: LoanListResponseSchema,
    }),
    ApiCommonErrors(),
  );

/** Documenta `QUERY /clients`. */
export const ApiListClientsWithBalance = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar clientes',
      description:
        'Clientes del prestamista con el que opera la sesión, paginados y con búsqueda opcional por nombre o cédula. Cada fila trae lo que debe (`balance`), lo que tiene vencido (`overdueAmount`, `overdueDays`) y cuántos préstamos activos tiene, sumando sus préstamos activos. Cualquier rol puede verla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de clientes con su saldo y su mora.',
      standardSchema: ClientListResponseSchema,
    }),
    ApiCommonErrors(),
  );
