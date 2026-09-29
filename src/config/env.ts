import { z } from 'zod';
import {
  AuthSecretSchema,
  commaSeparated,
  DatabaseUrlSchema,
  integer,
  LogLevelSchema,
  MobileSchemeSchema,
  MongoUriSchema,
  OriginSchema,
  QueuePrefixSchema,
  RedisUrlSchema,
} from '@/config/env-fields.js';

/** Variables de entorno de la API, validadas una sola vez al arrancar. */
const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: integer(1, 65535).default(3000),
    CORS_ORIGINS: commaSeparated(OriginSchema),
    TRUST_PROXY: integer(0, 10).optional(),
    THROTTLE_TTL_MS: integer(1000, 3_600_000).default(60_000),
    THROTTLE_LIMIT: integer(1, 100_000).default(100),
    SWAGGER_ENABLED: z.stringbool().optional(),
    LOG_LEVEL: LogLevelSchema.optional(),
    DATABASE_URL: DatabaseUrlSchema,
    REDIS_URL: RedisUrlSchema.optional(),
    MONGODB_URI: MongoUriSchema.optional(),
    QUEUE_PREFIX: QueuePrefixSchema.default('fiaro'),
    BETTER_AUTH_SECRET: AuthSecretSchema,
    BETTER_AUTH_URL: OriginSchema,
    MOBILE_APP_SCHEMES: commaSeparated(MobileSchemeSchema),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.TRUST_PROXY !== undefined,
    {
      path: ['TRUST_PROXY'],
      message:
        'es obligatoria en producción (usa 1 detrás de un proxy como Fly.io, o 0 si la API recibe tráfico directo)',
    },
  )
  .refine((env) => env.NODE_ENV !== 'production' || env.REDIS_URL, {
    path: ['REDIS_URL'],
    message: 'es obligatoria en producción: la auditoría durable la necesita',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.MONGODB_URI, {
    path: ['MONGODB_URI'],
    message: 'es obligatoria en producción: la auditoría durable la necesita',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.RESEND_API_KEY, {
    path: ['RESEND_API_KEY'],
    message:
      'es obligatoria en producción para poder enviar correos; en desarrollo, sin ella se usa un envío que solo registra el correo en los logs',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.RESEND_FROM_EMAIL, {
    path: ['RESEND_FROM_EMAIL'],
    message:
      'es obligatoria en producción para poder enviar correos; en desarrollo, sin ella se usa un envío que solo registra el correo en los logs',
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigins: [...new Set(env.CORS_ORIGINS)],
    trustProxy: env.TRUST_PROXY ?? 0,
    throttle: { ttlMs: env.THROTTLE_TTL_MS, limit: env.THROTTLE_LIMIT },
    swaggerEnabled: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
    logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    mongoUri: env.MONGODB_URI,
    queuePrefix: env.QUEUE_PREFIX,
    auth: {
      secret: env.BETTER_AUTH_SECRET,
      baseUrl: env.BETTER_AUTH_URL,
      mobileOrigins: [...new Set(env.MOBILE_APP_SCHEMES)].map(
        (scheme) => `${scheme}://`,
      ),
    },
    email: {
      resendApiKey: env.RESEND_API_KEY,
      fromAddress: env.RESEND_FROM_EMAIL,
    },
  }));

/** Configuración validada y tipada; se inyecta con el token `ENV`. */
export type Env = z.output<typeof EnvSchema>;

/**
 * Valida las variables de entorno y devuelve la configuración.
 *
 * @param source - Variables de entorno a validar; por defecto, las del proceso.
 * @returns La configuración validada y tipada.
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
