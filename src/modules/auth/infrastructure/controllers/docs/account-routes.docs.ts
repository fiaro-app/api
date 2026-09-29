import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { SESSION_SECURITY_SCHEME } from '@/shared/infrastructure/http/session-cookie.js';
import {
  ApiOriginHeaders,
  ApiOriginRejectedResponse,
  ApiRateLimitedResponse,
  ApiValidationFailedResponse,
} from '@/modules/auth/infrastructure/controllers/docs/auth-responses.docs.js';
import { AuthErrorSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';
import { StatusResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/auth-responses.schema.js';
import {
  ContactEmailAlreadyVerifiedSchema,
  ContactEmailNotSetSchema,
  ContactEmailVerificationCodeExpiredSchema,
  ContactEmailVerificationCodeInvalidSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/account-errors.schema.js';
import { UpdateProfileResponseSchema } from '@/modules/auth/infrastructure/controllers/schemas/account-responses.schema.js';

/** Documenta `POST /account/contact-email/request-verification`. */
export const ApiRequestContactEmailVerification = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Pedir verificar el correo de contacto',
      description:
        'Manda un código de 6 dígitos al `contactEmail` de la persona autenticada, válido 15 minutos.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description: 'Código mandado.',
      standardSchema: StatusResponseSchema,
    }),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiResponse({
      status: 409,
      description:
        'La cuenta no tiene correo de contacto (`CONTACT_EMAIL_NOT_SET`) o ya está verificado (`CONTACT_EMAIL_ALREADY_VERIFIED`).',
      standardSchema: z.union([
        ContactEmailNotSetSchema,
        ContactEmailAlreadyVerifiedSchema,
      ]),
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );

/** Documenta `PATCH /account/profile`. */
export const ApiUpdateProfile = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Actualizar el nombre o el correo de contacto',
      description:
        'Un campo ausente no se toca; `contactEmail: null` lo quita. Cambiarlo o quitarlo reinicia la verificación (D-69) y, si queda uno, manda un código nuevo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description: 'Perfil actualizado.',
      standardSchema: UpdateProfileResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );

/** Documenta `POST /account/contact-email/verify`. */
export const ApiVerifyContactEmail = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verificar el correo de contacto con el código',
      description:
        'Canjea el código recibido por correo. Máximo 5 intentos por persona en 15 minutos; pasados, hay que pedir un código nuevo.',
    }),
    ApiCookieAuth(SESSION_SECURITY_SCHEME),
    ApiOriginHeaders(),
    ApiResponse({
      status: 200,
      description: 'Correo de contacto verificado.',
      standardSchema: StatusResponseSchema,
    }),
    ApiValidationFailedResponse(),
    ApiResponse({
      status: 401,
      description: 'No hay sesión vigente (`UNAUTHORIZED`).',
      standardSchema: AuthErrorSchema,
    }),
    ApiResponse({
      status: 409,
      description:
        'El correo de contacto ya está verificado (`CONTACT_EMAIL_ALREADY_VERIFIED`).',
      standardSchema: ContactEmailAlreadyVerifiedSchema,
    }),
    ApiResponse({
      status: 400,
      description:
        'El código no es correcto, ya se usó o se agotaron los intentos (`CONTACT_EMAIL_VERIFICATION_CODE_INVALID`), o venció (`CONTACT_EMAIL_VERIFICATION_CODE_EXPIRED`).',
      standardSchema: z.union([
        ContactEmailVerificationCodeInvalidSchema,
        ContactEmailVerificationCodeExpiredSchema,
      ]),
    }),
    ApiOriginRejectedResponse(),
    ApiRateLimitedResponse(),
  );
