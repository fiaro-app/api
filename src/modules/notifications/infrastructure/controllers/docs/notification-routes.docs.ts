import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  NotificationNotFoundSchema,
  NotificationValidationErrorSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-errors.schema.js';
import {
  ClearNotificationsResponseSchema,
  MarkAllReadResponseSchema,
  NotificationResponseSchema,
  NotificationsPageResponseSchema,
  UnreadCountResponseSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** `401 UNAUTHENTICATED`: sin sesión vigente. */
const UnauthenticatedErrorSchema = ApiErrorSchema.extend({
  code: z.literal('UNAUTHENTICATED'),
}).meta({ id: 'NotificationUnauthenticated' });

/** El 401 de toda ruta protegida: sin sesión vigente. */
export const ApiUnauthenticatedResponse = () =>
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

/** Documenta `POST /notifications/read-all`. */
export const ApiMarkAllNotificationsRead = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Marcar todas mis notificaciones como leídas',
      description:
        'Marca, en una sola operación, todas las notificaciones propias que siguen sin leer; con `lenderId`, solo las de ese prestamista. Devuelve cuántas marcó (cero si ya no quedaba ninguna). Las ya leídas conservan su fecha de lectura.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cuántas se marcaron como leídas.',
      standardSchema: MarkAllReadResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: '`lenderId` no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
  );

/** Documenta `GET /notifications/unread-count`. */
export const ApiCountUnreadNotifications = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Contar mis notificaciones sin leer',
      description:
        'La cifra de la insignia de la barra lateral: cuántas notificaciones propias siguen sin leer; con `lenderId`, solo las de ese prestamista. No trae ninguna fila.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cuántas siguen sin leer.',
      standardSchema: UnreadCountResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: '`lenderId` no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
  );

/** Documenta `DELETE /notifications/:id`. */
export const ApiDeleteNotification = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Borrar una notificación',
      description:
        'Borra una notificación propia, sin vuelta atrás. Una ajena o inexistente responde `404`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({ status: 204, description: 'Notificación borrada.' }),
    ApiResponse({
      status: 400,
      description: 'El id no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
    ApiResponse({
      status: 404,
      description: 'La notificación no existe para esta persona (`NOT_FOUND`).',
      standardSchema: NotificationNotFoundSchema,
    }),
  );

/** Documenta `POST /notifications/clear`. */
export const ApiClearNotifications = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Borrar mis notificaciones',
      description:
        'Borra de una vez las notificaciones propias: todas, solo las leídas (`onlyRead`) o solo las de un prestamista (`lenderId`). Repetirlo no falla: devuelve cero.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Cuántas borró.',
      standardSchema: ClearNotificationsResponseSchema,
    }),
    ApiResponse({
      status: 400,
      description: 'El cuerpo no cumple el contrato (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
  );
