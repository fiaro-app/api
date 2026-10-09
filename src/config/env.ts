import { z } from 'zod';
import {
  buildMoraAlertsConfig,
  buildPushConfig,
  buildS3Config,
  buildSubscriptionConfig,
} from '@/config/env-builders.js';
import {
  AuthSecretSchema,
  commaSeparated,
  DatabaseUrlSchema,
  integer,
  LogLevelSchema,
  MobileAppVersionSchema,
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
    LEADS_NOTIFY_EMAIL: z.email().optional(),
    SUBSCRIPTION_TRIAL_DAYS: integer(1, 3650).default(30),
    SUBSCRIPTION_TRIAL_MAX_ACTIVE_LENDERS: integer(1, 1000).default(1),
    SUBSCRIPTION_TRIAL_MAX_COLLECTORS: integer(1, 100_000).default(5),
    MOBILE_MIN_SUPPORTED_VERSION: MobileAppVersionSchema.optional(),
    MOBILE_LATEST_VERSION: MobileAppVersionSchema.optional(),
    MOBILE_DOWNLOAD_URL: z.url().optional(),
    MAINTENANCE_MODE: z.stringbool().optional(),
    PUSH_DELIVERY: z.enum(['expo', 'log']).optional(),
    EXPO_ACCESS_TOKEN: z.string().optional(),
    MORA_ALERTS: z.stringbool().optional(),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL_BASE: z.url().optional(),
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
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.MOBILE_MIN_SUPPORTED_VERSION,
    {
      path: ['MOBILE_MIN_SUPPORTED_VERSION'],
      message:
        'es obligatoria en producción: GET /mobile/version la usa para bloquear versiones viejas de la app',
    },
  )
  .refine((env) => env.NODE_ENV !== 'production' || env.MOBILE_LATEST_VERSION, {
    path: ['MOBILE_LATEST_VERSION'],
    message:
      'es obligatoria en producción: GET /mobile/version la muestra en la pantalla de actualización',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.MOBILE_DOWNLOAD_URL, {
    path: ['MOBILE_DOWNLOAD_URL'],
    message:
      'es obligatoria en producción: GET /mobile/version la usa para enlazar la descarga del APK',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.S3_ENDPOINT, {
    path: ['S3_ENDPOINT'],
    message:
      'es obligatoria en producción: POST /lender/logo-upload-url la necesita para firmar la URL de subida',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.S3_BUCKET, {
    path: ['S3_BUCKET'],
    message:
      'es obligatoria en producción: POST /lender/logo-upload-url la necesita para firmar la URL de subida',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.S3_ACCESS_KEY_ID, {
    path: ['S3_ACCESS_KEY_ID'],
    message:
      'es obligatoria en producción: POST /lender/logo-upload-url la necesita para firmar la URL de subida',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.S3_SECRET_ACCESS_KEY, {
    path: ['S3_SECRET_ACCESS_KEY'],
    message:
      'es obligatoria en producción: POST /lender/logo-upload-url la necesita para firmar la URL de subida',
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.S3_PUBLIC_URL_BASE, {
    path: ['S3_PUBLIC_URL_BASE'],
    message:
      'es obligatoria en producción: es la URL pública del logo una vez subido (un dominio propio sobre el bucket, R2 no sirve su URL interna)',
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
    leads: { notifyEmail: env.LEADS_NOTIFY_EMAIL },
    subscription: buildSubscriptionConfig(env),
    maintenanceMode: env.MAINTENANCE_MODE ?? false,
    mobile: {
      minimumSupportedVersion: env.MOBILE_MIN_SUPPORTED_VERSION ?? '0.0.0',
      latestVersion: env.MOBILE_LATEST_VERSION ?? '0.0.0',
      downloadUrl: env.MOBILE_DOWNLOAD_URL ?? 'https://example.com/fiaro.apk',
    },
    push: buildPushConfig(env),
    moraAlerts: buildMoraAlertsConfig(env),
    s3: buildS3Config(env),
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
