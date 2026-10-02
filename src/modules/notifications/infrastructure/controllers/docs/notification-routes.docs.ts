import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  NotificationNotFoundSchema,
  NotificationValidationErrorSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-errors.schema.js';
import {
  NotificationResponseSchema,
  NotificationsPageResponseSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'NotificationUnauthenticated' });

/** El 401 de toda ruta protegida: sin sesión vigente. */
const ApiUnauthenticatedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'No hay sesión vigente (`UNAUTHENTICATED`).',
    standardSchema: UnauthenticatedErrorSchema,
  });

/** Documenta `QUERY /notifications`. */
export const ApiListNotifications = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Buscar mis notificaciones',
      description:
        'Notificaciones de la sesión, de todos los prestamistas para los que trabaja salvo que filtre por uno, paginadas y con filtro opcional de solo-sin-leer. Siempre las propias.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Página de notificaciones.',
      standardSchema: NotificationsPageResponseSchema,
    }),
    ApiUnauthenticatedResponse(),
  );

/** Documenta `POST /notifications/:id/read`. */
export const ApiMarkNotificationRead = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Marcar una notificación como leída',
      description: 'Siempre la propia. Volver a marcarla no falla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Notificación marcada como leída.',
      standardSchema: NotificationResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El id no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 404,
      description: 'La notificación no existe, o no es propia (`NOT_FOUND`).',
      standardSchema: NotificationNotFoundSchema,
    }),
  );
