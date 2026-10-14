import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CollectionVisitForbiddenSchema,
  CollectionVisitNotFoundSchema,
  CollectionVisitValidationErrorSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-errors.schema.js';
import {
  CollectionVisitResponseSchema,
  CollectionVisitsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'CollectionVisitUnauthenticated' });

const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

const ApiNoActiveMembershipResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'La sesión no tiene ninguna membresía activa con un prestamista (`FORBIDDEN`).',
    standardSchema: CollectionVisitForbiddenSchema,
  });

const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, la membresía activa no tiene rol `COLLECTOR`, o no tiene una asignación vigente para este préstamo el día de la visita ("modo cobrador", PRODUCT.md §6) (`FORBIDDEN`).',
    standardSchema: CollectionVisitForbiddenSchema,
  });

const ApiLoanNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description:
      'El préstamo no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: CollectionVisitNotFoundSchema,
  });

/** Documenta `POST /loans/:loanId/collection-visits`. */
export const ApiCreateCollectionVisit = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Registrar una visita de cobro',
      description:
        'Idempotente: el id lo genera el dispositivo, así que reenviar la misma visita (misma conexión perdida) devuelve el resultado original sin duplicar nada (D-29). outcome PAID exige payment; RESCHEDULED exige promisedDate; ningún otro resultado acepta ninguno de los dos. Exige rol COLLECTOR en la membresía activa, con una asignación vigente para este préstamo el día de la visita ("modo cobrador", PRODUCT.md §6).',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Visita registrada (o la que ya existía, si se reenvió).',
      standardSchema: CollectionVisitResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'El resultado, el pago o promisedDate no combinan (`VALIDATION_FAILED`).',
      standardSchema: CollectionVisitValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiLoanNotFoundResponse(),
  );

/** Documenta `GET /loans/:loanId/collection-visits`. */
export const ApiListCollectionVisits = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el historial de visitas de un préstamo',
      description:
        'Todas las visitas del préstamo, con su pago si lo generaron, de la más antigua a la más nueva, sin paginar. Cualquier rol puede verlas.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Visitas del préstamo.',
      standardSchema: CollectionVisitsResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
    ApiLoanNotFoundResponse(),
  );
