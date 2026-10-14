import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiUnauthenticatedResponse } from '@/modules/notifications/infrastructure/controllers/docs/notification-routes.docs.js';
import { NotificationValidationErrorSchema } from '@/modules/notifications/infrastructure/controllers/schemas/notification-errors.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `POST /push-tokens`. */
export const ApiRegisterPushToken = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Registrar el dispositivo para las notificaciones push',
      description:
        'La app lo manda al abrir la sesión en el celular, con el token de Expo del dispositivo. Repetirlo no falla: si el token ya existía, se reasigna a esta sesión. No devuelve cuerpo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 204,
      description: 'Token registrado.',
    }),
    ApiResponse({
      status: 400,
      description:
        'El token no tiene la forma de un token de Expo (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
  );

/** Documenta `POST /push-tokens/revoke`. */
export const ApiRevokePushToken = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Quitar el dispositivo de las notificaciones push',
      description:
        'La app lo manda al cerrar la sesión. Solo quita un token de esta sesión: uno de otra persona no se toca. Repetirlo tampoco falla. No devuelve cuerpo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 204,
      description: 'Listo: el token se quitó, o no era de esta sesión.',
    }),
    ApiResponse({
      status: 400,
      description:
        'El token no tiene la forma de un token de Expo (`VALIDATION_FAILED`).',
      standardSchema: NotificationValidationErrorSchema,
    }),
    ApiUnauthenticatedResponse(),
  );
