import { applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiResponse } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '@/shared/infrastructure/http/session-cookie.js';
import {
  AuthErrorSchema,
  RateLimitedSchema,
  ValidationErrorSchema,
} from '@/modules/auth/infrastructure/controllers/schemas/auth-errors.schema.js';

/** La respuesta trae la cookie de sesión nueva o renovada. */
export const sessionCookieHeaders = {
  'Set-Cookie': {
    description: `Cookie de sesión \`${SESSION_COOKIE_NAME}\` (en producción con el prefijo \`__Secure-\`).`,
    schema: { type: 'string' },
  },
} as const;

/**
 * Documenta que las peticiones con cookie deben decir de dónde vienen: el navegador envía
 * `Origin` solo; las apps móviles envían `expo-origin` con su esquema (`fiaro://`). Sin un origen
 * de confianza la respuesta es 403.
 */
export const ApiOriginHeaders = () =>
  applyDecorators(
    ApiHeader({
      name: 'Origin',
      required: false,
      description:
        'Origen de la página que llama (lo envía el navegador). Debe estar en `CORS_ORIGINS`.',
    }),
    ApiHeader({
      name: 'expo-origin',
      required: false,
      description:
        'Esquema de la app móvil (lo envía el cliente de better-auth para Expo). Debe estar en `MOBILE_APP_SCHEMES`.',
    }),
  );

/** Documenta el 400 por un cuerpo que no cumple el schema de la ruta. */
export const ApiValidationFailedResponse = () =>
  ApiResponse({
    status: 400,
    description:
      'El cuerpo no es válido: un campo falta, tiene el formato equivocado o sobra. `issues` dice cuál.',
    standardSchema: ValidationErrorSchema,
  });

/** Documenta el 403 por un origen que no es de confianza. */
export const ApiOriginRejectedResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Petición con cookie desde un origen que no es de confianza. Códigos: `INVALID_ORIGIN` (origen no permitido) y `MISSING_OR_NULL_ORIGIN` (sin origen).',
    standardSchema: AuthErrorSchema,
  });

/** Documenta el 429 con su cabecera `Retry-After`. */
export const ApiRateLimitedResponse = () =>
  ApiResponse({
    status: 429,
    description:
      'Demasiados intentos desde esta IP. Espera los segundos de `Retry-After` antes de reintentar.',
    standardSchema: RateLimitedSchema,
    headers: {
      'Retry-After': {
        description: 'Segundos que hay que esperar antes de reintentar.',
        schema: { type: 'integer', example: 42 },
      },
    },
  });
