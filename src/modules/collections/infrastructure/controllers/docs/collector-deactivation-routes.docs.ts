import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  CollectorDeactivationConflictSchema,
  CollectorDeactivationForbiddenSchema,
  CollectorDeactivationNotFoundSchema,
  CollectorDeactivationValidationErrorSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-deactivation-errors.schema.js';
import { CollectorDeactivationResponseSchema } from '@/modules/collections/infrastructure/controllers/schemas/collector-deactivation-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'CollectorDeactivationUnauthenticated' });

/** Documenta `POST /collectors/:id/deactivate`. */
export const ApiDeactivateCollector = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Dar de baja a un cobrador',
      description:
        'Da de baja la membresía (igual que `POST /memberships/:id/deactivate`) después de reasignar, en el mismo paso, cada préstamo activo que tiene asignado hoy: reassignments debe cubrir exactamente esos préstamos, ni de más ni de menos. Idempotente: repetir la petición sobre un cobrador que ya no tiene préstamos vigentes solo confirma la baja. Nadie puede dar de baja su propia membresía por esta ruta. Exige rol `OWNER` o `LENDER` en la membresía activa.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description:
        'Cobrador dado de baja, con cuántos préstamos cambiaron de cobrador.',
      standardSchema: CollectorDeactivationResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'reassignments no cubre exactamente los préstamos activos del cobrador, o algún cobrador destino no existe, no está activo, no tiene el rol COLLECTOR o es el mismo que se da de baja (`VALIDATION_FAILED`).',
      standardSchema: CollectorDeactivationValidationErrorSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: UnauthenticatedErrorSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'Sin ninguna membresía activa, la membresía activa no tiene rol `OWNER` ni `LENDER`, o el pedido es sobre la propia membresía de la sesión (`FORBIDDEN`).',
      standardSchema: CollectorDeactivationForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description:
        'La membresía no existe, o no tiene el rol COLLECTOR, en el prestamista de la sesión (`NOT_FOUND`).',
      standardSchema: CollectorDeactivationNotFoundSchema,
    }),
    ApiResponse({
      status: 409,
      description:
        'El cobrador tiene asignaciones programadas para después de hoy: hay que esperar a que empiecen (`CONFLICT`).',
      standardSchema: CollectorDeactivationConflictSchema,
    }),
  );
