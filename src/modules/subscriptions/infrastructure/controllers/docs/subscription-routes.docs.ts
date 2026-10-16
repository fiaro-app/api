import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  SubscriptionForbiddenSchema,
  SubscriptionNotFoundSchema,
  SubscriptionUnauthenticatedSchema,
} from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-errors.schema.js';
import { SubscriptionResponseSchema } from '@/modules/subscriptions/infrastructure/controllers/schemas/subscription-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `GET /subscription`. */
export const ApiGetSubscription = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver el plan del negocio',
      description:
        'La suscripción del Tenant del prestamista con el que opera la sesión: plan, estado (`ACTIVE`, `GRACE_PERIOD`, `READ_ONLY`), fechas, límites y uso. Cualquier rol puede verla. Con `READ_ONLY` (pasada la gracia) las escrituras responden `403 SUBSCRIPTION_READ_ONLY`, salvo registrar visitas y pagos y los cuadres (D-148); la lectura nunca se bloquea.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'La suscripción con su estado y su uso.',
      standardSchema: SubscriptionResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
      standardSchema: SubscriptionUnauthenticatedSchema,
    }),
    ApiResponse({
      status: 403,
      description:
        'La sesión no tiene ninguna membresía activa con un prestamista (`FORBIDDEN`).',
      standardSchema: SubscriptionForbiddenSchema,
    }),
    ApiResponse({
      status: 404,
      description: 'El negocio no tiene suscripción (`NOT_FOUND`).',
      standardSchema: SubscriptionNotFoundSchema,
    }),
  );
