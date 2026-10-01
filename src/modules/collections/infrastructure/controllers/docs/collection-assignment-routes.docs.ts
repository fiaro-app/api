import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CollectionAssignmentForbiddenSchema,
  CollectionAssignmentNotFoundSchema,
  CollectionAssignmentValidationErrorSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-assignment-errors.schema.js';
import {
  CollectionAssignmentResponseSchema,
  CollectionAssignmentsResponseSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collection-assignment-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'CollectionAssignmentUnauthenticated' });

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
    standardSchema: CollectionAssignmentForbiddenSchema,
  });

const ApiWrongRoleResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Sin ninguna membresía activa, o la membresía activa no tiene rol `OWNER` ni `LENDER` (`FORBIDDEN`).',
    standardSchema: CollectionAssignmentForbiddenSchema,
  });

const ApiLoanNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description:
      'El préstamo no existe, o es de otro prestamista (`NOT_FOUND`).',
    standardSchema: CollectionAssignmentNotFoundSchema,
  });

/** Documenta `POST /loans/:loanId/collection-assignments`. */
export const ApiCreateCollectionAssignment = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Asignar un cobrador a un préstamo',
      description:
        'Sin effectiveTo (permanente): cierra la asignación vigente del préstamo, si tiene una. Con effectiveTo: reemplazo de uno o varios días, no toca la permanente. Exige rol OWNER o LENDER en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 201,
      description: 'Asignación creada.',
      standardSchema: CollectionAssignmentResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'La membresía no tiene el rol COLLECTOR, o effectiveTo es anterior a effectiveFrom (`VALIDATION_FAILED`).',
      standardSchema: CollectionAssignmentValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiWrongRoleResponse(),
    ApiResponse({
      status: 404,
      description:
        'El préstamo o la membresía no existen, o son de otro prestamista (`NOT_FOUND`).',
      standardSchema: CollectionAssignmentNotFoundSchema,
    }),
  );

/** Documenta `GET /loans/:loanId/collection-assignments`. */
export const ApiListCollectionAssignments = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el historial de asignaciones de un préstamo',
      description:
        'Todas las asignaciones del préstamo, de la más antigua a la más nueva, sin paginar. Cualquier rol puede verlas.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Asignaciones del préstamo.',
      standardSchema: CollectionAssignmentsResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiNoActiveMembershipResponse(),
    ApiLoanNotFoundResponse(),
  );
