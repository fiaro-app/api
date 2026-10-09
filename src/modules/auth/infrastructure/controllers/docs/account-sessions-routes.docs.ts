import { ApiErrorSchema } from '@fiaro-app/contracts';
import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthErrorSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import { AccountSessionsResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/account-sessions-responses.schema.js';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';

/** Documenta `GET /account/sessions`. */
export const ApiListAccountSessions = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver mis sesiones abiertas',
      description:
        'Las sesiones vigentes de la persona autenticada, la usada más recientemente primero, con el dispositivo (a partir de su `User-Agent`), la IP, cuándo se abrió y su último uso (con precisión de un día: la sesión se renueva como máximo una vez al día). `isCurrent` marca la sesión desde la que se consulta. Nunca trae el token de ninguna.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description: 'Las sesiones abiertas.',
      standardSchema: AccountSessionsResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
  );

/** Documenta `DELETE /account/sessions/:id`. */
export const ApiRevokeAccountSession = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cerrar una sesión puntual',
      description:
        'Cierra una de las sesiones de la persona autenticada, por ejemplo la de un dispositivo que perdió, sin tocar las demás. La sesión actual no se cierra por aquí: para eso está `POST /auth/sign-out`, que además limpia la cookie.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({ status: 204, description: 'Sesión cerrada.' }),
    ApiResponse({
      status: 400,
      description: 'El id no es un UUID (`VALIDATION_FAILED`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('VALIDATION_FAILED'),
      }).meta({ id: 'AccountSessionValidationError' }),
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiResponse({
      status: 404,
      description:
        'La sesión no existe, ya venció, o es de otra persona (`NOT_FOUND`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('NOT_FOUND'),
      }).meta({ id: 'AccountSessionNotFound' }),
    }),
    ApiResponse({
      status: 409,
      description:
        'Es la sesión actual: se cierra con `POST /auth/sign-out` (`CONFLICT`).',
      standardSchema: ApiErrorSchema.extend({
        code: z.literal('CONFLICT'),
      }).meta({ id: 'AccountSessionIsCurrent' }),
    }),
  );
