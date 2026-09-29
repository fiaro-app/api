import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';
import {
  ApiOriginHeaders,
  ApiOriginRejectedResponse,
  ApiRateLimitedResponse,
  ApiSignInRateLimitedResponse,
  ApiValidationFailedResponse,
  sessionCookieHeaders,
} from '@/modules/auth/infrastructure/controllers/docs/auth-responses.docs.js';
import {
  AuthErrorSchema,
  PasswordResetCodeExpiredSchema,
  PasswordResetCodeInvalidSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import {
  ChangePasswordResponseSchema,
  SessionResponseSchema,
  SignInResponseSchema,
  SignOutResponseSchema,
  StatusResponseSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';

/** Documenta `POST /auth/sign-in/phone-number`. */
export const ApiSignIn = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Iniciar sesión',
      description:
        'Abre una sesión de 30 días con el celular (E.164) y la contraseña. Un celular sin cuenta y una contraseña incorrecta responden lo mismo y tardan lo mismo, para no revelar qué celulares tienen cuenta. Máximo 5 intentos por minuto y por IP; y con 5 contraseñas incorrectas seguidas para un mismo celular se bloquean sus inicios de sesión nuevos durante 15 minutos (`SIGN_IN_LOCKED`), sin tocar las sesiones abiertas.',
    }),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description:
        'Sesión abierta. La cookie de sesión llega en `Set-Cookie`; `user.mustChangePassword` indica si debe cambiar una contraseña temporal antes de operar.',
      standardSchema: SignInResponseSchema,
      headers: sessionCookieHeaders,
    }),
    ApiValidationFailedResponse(),
    ApiResponse({
      status: 401,
      description:
        'El celular o la contraseña son incorrectos (`INVALID_PHONE_NUMBER_OR_PASSWORD`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiOriginRejectedResponse(),
    ApiSignInRateLimitedResponse(),
  );

/** Documenta `GET /auth/get-session`. */
export const ApiGetSession = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ver la sesión actual',
      description:
        'Devuelve la sesión y la persona de la cookie, o `null` si no hay sesión vigente. Si la sesión lleva más de un día sin renovarse, la renueva 30 días y responde con la cookie nueva: la app debe guardarla.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiResponse({
      status: 200,
      description:
        'La sesión y su persona, o `null` sin sesión vigente. Con renovación, la cookie nueva llega en `Set-Cookie`.',
      standardSchema: SessionResponseSchema,
      headers: sessionCookieHeaders,
    }),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /auth/sign-out`. */
export const ApiSignOut = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cerrar sesión',
      description:
        'Revoca la sesión de la cookie en el servidor y borra la cookie. Es idempotente: sin sesión también responde 200.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description:
        'Sesión cerrada. `Set-Cookie` borra la cookie del dispositivo.',
      standardSchema: SignOutResponseSchema,
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /auth/change-password`. */
export const ApiChangePassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cambiar la contraseña',
      description:
        'Cambia la contraseña con la actual como prueba. Siempre revoca las demás sesiones de la persona (quien conocía la contraseña anterior pierde el acceso), responde con una sesión nueva y, si la contraseña era temporal, quita `mustChangePassword`. Rechaza una contraseña nueva demasiado fácil de adivinar: de las más usadas, un patrón (`12345678`, `aaaaaaaa`) o que lleva el celular o la cédula de la persona. Es, junto con ver la sesión y cerrar sesión, una de las tres rutas que sirven con una contraseña temporal. Máximo 5 intentos por minuto y por IP.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description:
        'Contraseña cambiada. La cookie de la sesión nueva llega en `Set-Cookie` y reemplaza a la anterior.',
      standardSchema: ChangePasswordResponseSchema,
      headers: sessionCookieHeaders,
    }),
    ApiValidationFailedResponse(),
    ApiResponse({
      status: 400,
      description:
        'La contraseña actual es incorrecta (`INVALID_PASSWORD`) o la nueva es demasiado fácil de adivinar (`PASSWORD_TOO_WEAK`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /auth/revoke-other-sessions`. */
export const ApiRevokeOtherSessions = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cerrar las demás sesiones',
      description:
        'Cierra en el servidor todas las sesiones de la persona salvo la de la cookie: los demás dispositivos pierden el acceso en su siguiente petición. Sirve cuando se pierde o se presta un teléfono. No cambia la contraseña (para eso, `change-password`, que también cierra las demás). Cada sesión cerrada queda en la auditoría como `auth.session.revoked`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description: 'Las demás sesiones quedaron cerradas.',
      standardSchema: StatusResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /auth/request-password-reset`. */
export const ApiRequestPasswordReset = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Pedir recuperar la contraseña',
      description:
        'Si el celular tiene cuenta y un correo de contacto, manda un código de 6 dígitos por correo, válido 15 minutos. Responde lo mismo exista o no la cuenta, tenga o no correo, y aunque se agoten los pedidos para ese celular (máximo 3 por hora): así no revela qué celulares tienen cuenta ni correo.',
    }),
    ApiResponse({
      status: 200,
      description: 'La solicitud se procesó. No dice si se mandó el correo.',
      standardSchema: StatusResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /auth/reset-password`. */
export const ApiResetPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Restablecer la contraseña con el código',
      description:
        'Canjea el código recibido por correo por una contraseña nueva. Rechaza la nueva si es demasiado fácil de adivinar, igual que al cambiarla con sesión abierta. Al salir bien, cierra todas las sesiones de la persona (la actual, si tenía una, incluida): hay que iniciar sesión de nuevo. Máximo 5 intentos por celular en 15 minutos; pasados, hay que pedir un código nuevo.',
    }),
    ApiResponse({
      status: 200,
      description:
        'Contraseña restablecida. Todas las sesiones quedaron cerradas.',
      standardSchema: StatusResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiResponse({
      status: 400,
      description:
        'El código no es correcto, ya se usó o se agotaron los intentos (`PASSWORD_RESET_CODE_INVALID`); el código venció (`PASSWORD_RESET_CODE_EXPIRED`); o la contraseña nueva es demasiado fácil de adivinar (`PASSWORD_TOO_WEAK`).',
      standardSchema: z.union([
        PasswordResetCodeInvalidSchema,
        PasswordResetCodeExpiredSchema,
        AuthErrorSchema,
      ]),
    }),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /auth/revoke-sessions`. */
export const ApiRevokeSessions = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cerrar todas las sesiones',
      description:
        'Cierra en el servidor todas las sesiones de la persona, la de la cookie incluida: en este dispositivo la cookie sigue guardada pero ya no vale, así que la app debe tratarla como cerrada y borrarla. Cada sesión cerrada queda en la auditoría como `auth.session.revoked`.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description: 'Todas las sesiones quedaron cerradas.',
      standardSchema: StatusResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );
