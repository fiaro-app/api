import { z } from 'zod';

/** Entero sin signo escrito solo con dígitos: rechaza `''`, `'1e3'` y `'0x10'`, que `z.coerce.number()` aceptaría. */
const integer = (min: number, max: number) =>
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

const OriginSchema = z
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

/** Variables de entorno de la API, validadas una sola vez al arrancar. */
const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: integer(1, 65535).default(3000),
    CORS_ORIGINS: z
      .string()
      .prefault('')
      .transform(splitList)
      .pipe(z.array(OriginSchema)),
    TRUST_PROXY: integer(0, 10).optional(),
    THROTTLE_TTL_MS: integer(1000, 3_600_000).default(60_000),
    THROTTLE_LIMIT: integer(1, 100_000).default(100),
    SWAGGER_ENABLED: z.stringbool().optional(),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.TRUST_PROXY !== undefined,
    {
      path: ['TRUST_PROXY'],
      message:
        'es obligatoria en producción (usa 1 detrás de un proxy como Fly.io, o 0 si la API recibe tráfico directo)',
    },
  )
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: [...new Set(env.CORS_ORIGINS)],
    trustProxy: env.TRUST_PROXY ?? 0,
    throttle: { ttlMs: env.THROTTLE_TTL_MS, limit: env.THROTTLE_LIMIT },
    swaggerEnabled: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
  }));

/** Configuración validada y tipada; se inyecta con el token `ENV`. */
export type Env = z.output<typeof EnvSchema>;

/**
 * Valida las variables de entorno y devuelve la configuración.
 *
 * @throws Un solo error con todas las variables inválidas, sin repetir los valores recibidos.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map(
    (issue) => `  - ${issue.path.map(String).join('.')}: ${issue.message}`,
  );
  throw new Error(`Variables de entorno inválidas:\n${problems.join('\n')}`);
}
