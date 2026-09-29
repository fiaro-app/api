import type { BetterAuthOptions } from 'better-auth';
import type { Env } from '@/config/env.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { SESSION_COOKIE_PREFIX } from '@/shared/infrastructure/http/session-cookie.js';
import { logToNest } from '@/modules/auth/infrastructure/better-auth/auth-logger.js';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/modules/auth/domain/policies/password.policy.js';
import {
  SESSION_LIFETIME_SECONDS,
  SESSION_REFRESH_INTERVAL_SECONDS,
} from '@/modules/auth/domain/policies/session.policy.js';
import {
  CHANGE_PASSWORD_PATH,
  CLIENT_IP_HEADER,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';

/** Cinco intentos por minuto y por IP en las rutas donde se adivinan contraseñas (§11 de ARCHITECTURE.md). */
const PASSWORD_ATTEMPTS = { window: 60, max: 5 } as const;

/**
 * Límites de longitud de la contraseña. `enabled` queda en `false`: el email de better-auth es
 * técnico (se deduce del celular), así que no puede ser una credencial y el login por email no
 * existe. Solo se conservan los límites, que también aplican al cambiar la contraseña.
 */
export const passwordOptions = {
  enabled: false,
  minPasswordLength: PASSWORD_MIN_LENGTH,
  maxPasswordLength: PASSWORD_MAX_LENGTH,
} as const satisfies BetterAuthOptions['emailAndPassword'];

/**
 * Forma de la tabla `users`: `name` y `email` de better-auth son `fullName` y `loginEmail`, y los
 * datos propios de Fiaro son campos adicionales que ningún cliente puede escribir (`input: false`).
 */
export const userOptions = {
  fields: { name: 'fullName', email: 'loginEmail' },
  additionalFields: {
    contactEmail: { type: 'string', required: false, input: false },
    contactEmailVerified: {
      type: 'boolean',
      required: false,
      defaultValue: false,
      input: false,
    },
    nationalId: { type: 'string', required: false, input: false },
    mustChangePassword: {
      type: 'boolean',
      required: false,
      defaultValue: false,
      input: false,
    },
  },
} as const satisfies BetterAuthOptions['user'];

/**
 * Sesión de 30 días que cada día de uso renueva. No hay caché de sesión en la cookie: revocar una
 * sesión (borrar su fila) surte efecto en la siguiente petición, no cuando venza la caché.
 */
export const sessionOptions = {
  expiresIn: SESSION_LIFETIME_SECONDS,
  updateAge: SESSION_REFRESH_INTERVAL_SECONDS,
} as const satisfies BetterAuthOptions['session'];

/**
 * Opciones avanzadas: comprobación de origen y CSRF siempre activas (better-auth las apaga sola
 * con `NODE_ENV=test`, y así se comportan igual en todos los entornos), cookies con el prefijo
 * de Fiaro, ids UUIDv7 y la IP del cliente tomada de {@link CLIENT_IP_HEADER}.
 *
 * @param ids - Generador con el que better-auth crea los identificadores de sus filas.
 */
export function advancedOptions(
  ids: IdGenerator,
): NonNullable<BetterAuthOptions['advanced']> {
  return {
    disableOriginCheck: false,
    disableCSRFCheck: false,
    cookiePrefix: SESSION_COOKIE_PREFIX,
    database: { generateId: () => ids.next() },
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  };
}

/**
 * Rate limit en memoria, válido mientras haya una sola instancia. El general repite el de Nest;
 * iniciar sesión y cambiar la contraseña tienen el suyo, más estricto.
 *
 * @param throttle - Ventana y límite del rate limit general de la API.
 */
export function rateLimitOptions(
  throttle: Env['throttle'],
): NonNullable<BetterAuthOptions['rateLimit']> {
  return {
    enabled: true,
    storage: 'memory',
    window: Math.ceil(throttle.ttlMs / 1000),
    max: throttle.limit,
    customRules: {
      [SIGN_IN_PATH]: PASSWORD_ATTEMPTS,
      [CHANGE_PASSWORD_PATH]: PASSWORD_ATTEMPTS,
    },
  };
}

/**
 * Los logs de better-auth salen por el logger de Nest (`logToNest`), es decir, como JSON de Pino
 * con el `requestId`; solo avisos y errores, y apagados en las pruebas, donde los rechazos son
 * esperados.
 *
 * @param nodeEnv - Entorno de ejecución.
 */
export function loggerOptions(
  nodeEnv: Env['nodeEnv'],
): NonNullable<BetterAuthOptions['logger']> {
  return {
    disabled: nodeEnv === 'test',
    level: 'warn',
    log: logToNest,
  };
}
