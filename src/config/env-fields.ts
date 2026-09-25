import { z } from 'zod';

/** Niveles de log de Pino, del más grave al más detallado; `silent` apaga todo. */
export const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

/** Nivel mínimo que se escribe en el log. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Nivel de log válido para `LOG_LEVEL`. */
export const LogLevelSchema = z.enum(LOG_LEVELS, {
  error: 'debe ser fatal, error, warn, info, debug, trace o silent',
});

/**
 * Entero sin signo escrito solo con dígitos: rechaza `''`, `'1e3'` y `'0x10'`, que
 * `z.coerce.number()` aceptaría.
 *
 * @param min - Valor mínimo permitido.
 * @param max - Valor máximo permitido.
 */
export const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/, 'debe ser un número entero sin signo')
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `debe ser al menos ${String(min)}`)
        .max(max, `debe ser como máximo ${String(max)}`),
    );

/** Origen tal como lo envía el navegador: esquema, host y puerto, sin ruta ni barra final. */
const isCanonicalOrigin = (value: string): boolean => {
  if (!URL.canParse(value)) {
    return false;
  }
  const { protocol, origin } = new URL(value);
  return (protocol === 'http:' || protocol === 'https:') && origin === value;
};

/** Origen `http(s)` sin ruta ni barra final, por ejemplo `https://app.fiaro.co`. */
export const OriginSchema = z
  .string()
  .refine(
    isCanonicalOrigin,
    'debe ser un origen http(s) sin ruta ni barra final, por ejemplo https://app.fiaro.co',
  );

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

/**
 * Lista escrita en una sola variable, separada por comas. Ignora espacios y entradas vacías; sin
 * la variable, la lista queda vacía. Cada elemento se valida con `item`.
 *
 * @param item - Schema de cada elemento de la lista.
 */
export const commaSeparated = (item: z.ZodType<string, string>) =>
  z.string().prefault('').transform(splitList).pipe(z.array(item));

/** URL de conexión a PostgreSQL (`postgresql://` o `postgres://`). */
export const DatabaseUrlSchema = z.url({
  protocol: /^postgres(?:ql)?$/,
  error:
    'debe ser una URL de conexión a PostgreSQL, por ejemplo postgresql://usuario:clave@localhost:5432/base',
});

/** Secreto con el que se firman las cookies de sesión. */
export const AuthSecretSchema = z
  .string()
  .min(
    32,
    'debe tener al menos 32 caracteres (genera una con: openssl rand -base64 32)',
  );

/** Esquema de enlace profundo de una app nativa, tal como se escribe en `app.json` (`fiaro`). */
export const MobileSchemeSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9+.-]*$/,
    'debe ser un esquema en minúsculas, como el `scheme` de app.json (por ejemplo fiaro)',
  );
