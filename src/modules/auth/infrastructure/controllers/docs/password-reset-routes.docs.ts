import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import {
  ApiRateLimitedResponse,
  ApiValidationFailedResponse,
} from '@/modules/auth/infrastructure/controllers/docs/auth-responses.docs.js';
import {
  AuthErrorSchema,
  AuthTurnstileFailedSchema,
  PasswordResetCodeExpiredSchema,
  PasswordResetCodeInvalidSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import { StatusResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';

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
    ApiResponse({
      status: 400,
      description:
        'No se pudo validar el desafío de Cloudflare Turnstile (`TURNSTILE_FAILED`).',
      standardSchema: AuthTurnstileFailedSchema,
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
