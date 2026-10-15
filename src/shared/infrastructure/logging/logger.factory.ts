import pino, { type DestinationStream, type Logger } from 'pino';
import type { LogLevel } from '@/config/env-fields.js';
import { currentRequestContext } from '@/shared/infrastructure/logging/request-context.js';

/**
 * Datos que no deben quedar en un log aunque alguien los agregue por descuido. Es una segunda
 * barrera: el log de las peticiones ya solo escribe campos elegidos (ver `serializeRequest`), no
 * cabeceras ni cuerpos.
 */
export const REDACTED_PATHS: readonly string[] = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
  '*.secret',
];

/** Texto que reemplaza a un dato protegido. */
export const REDACTED_TEXT = '[redacted]';

/** Cómo se crea el logger. */
export interface LoggerOptions {
  /** Nivel mínimo que se escribe. */
  readonly level: LogLevel;
  /** Dónde se escribe; por defecto la salida estándar. Las pruebas pasan uno propio. */
  readonly destination?: DestinationStream;
}

/**
 * Crea el logger de la aplicación: una línea de JSON por registro, con el nivel como texto, la
 * hora en ISO 8601, el nombre del servicio y, dentro de una petición, su `requestId`.
 *
 * @remarks
 * JSON en la salida estándar es lo que leen Alloy y Loki en el entorno local y la plataforma en
 * producción; el texto plano no se puede filtrar por campos.
 *
 * @param options - Nivel y destino.
 * @returns El logger de Pino.
 */
export function createLogger({ level, destination }: LoggerOptions): Logger {
  return pino(
    {
      level,
      base: { service: 'fiaro-api' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
      redact: { paths: [...REDACTED_PATHS], censor: REDACTED_TEXT },
      mixin: () => ({ ...currentRequestContext() }),
    },
    destination,
  );
}
