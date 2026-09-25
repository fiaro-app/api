import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { DestinationStream } from 'pino';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import {
  API_DEFAULT_VERSION,
  API_VERSIONING,
  varyByApiVersion,
} from '@/shared/infrastructure/http/api-versioning.js';
import { buildCorsOptions } from '@/shared/infrastructure/http/cors.options.js';
import { SchemaValidationPipe } from '@/shared/infrastructure/http/schema-validation.pipe.js';
import { createSecurityHeaders } from '@/shared/infrastructure/http/security-headers.middleware.js';
import { createLanguageMiddleware } from '@/shared/infrastructure/i18n/language.middleware.js';
import { configureZodMessages } from '@/shared/infrastructure/i18n/zod-messages.js';
import type { LogBatcher } from '@/shared/infrastructure/logging/log-batcher.js';
import { LOG_BATCHER } from '@/shared/infrastructure/logging/log-batcher.token.js';
import { setupLogging } from '@/shared/infrastructure/logging/logging.setup.js';
import {
  DOCS_PATH,
  setupSwagger,
} from '@/shared/infrastructure/swagger/swagger.setup.js';

/** Opciones de `configureApp` que solo cambian las pruebas. */
export interface AppSetupOptions {
  /** Dónde se escriben los logs; por defecto la salida estándar. */
  readonly logDestination?: DestinationStream;
  /** Idiomas que negocia `Accept-Language`; por defecto los de `src/i18n`. */
  readonly languages?: readonly string[];
}

/**
 * Configuración HTTP global de la aplicación; la usan `main.ts` y las pruebas e2e.
 *
 * @remarks
 * El orden importa, cada middleware ve la petición en el orden en que se registra:
 * 1. `trust proxy`: define de dónde sale `req.ip`, que cuenta el rate limit y sale en el log.
 * 2. Logs: el logger de Nest pasa a Pino y cada petición queda registrada; con el registro durable
 *    activo, cada línea también se copia al lote que va a MongoDB. Va antes que todo lo demás para
 *    que también queden las que otro middleware responde por su cuenta (preflight).
 * 3. Idioma: elige el de la petición (`Accept-Language`) para que cualquier error posterior, de
 *    otro middleware o de una ruta, salga traducido. Los mensajes por defecto de Zod pasan a ser
 *    claves del catálogo.
 * 4. Cabeceras de seguridad, primero de las demás para que salgan también en errores, 404 y
 *    preflight.
 * 5. `cookie-parser`.
 * 6. CORS, solo si hay orígenes configurados.
 * 7. `Vary` y versionado por cabecera.
 * 8. Pipe de validación global.
 * 9. Swagger, solo si está activo.
 *
 * El rate limit es un guard global de `AppModule`, no un middleware; el filtro global de
 * excepciones, un provider del mismo módulo.
 *
 * @param app - Aplicación de Nest sobre Express que se configura.
 * @param options - Ajustes que solo usan las pruebas.
 */
export function configureApp(
  app: NestExpressApplication,
  options: AppSetupOptions = {},
): void {
  const env = app.get<Env>(ENV);

  app.set('trust proxy', env.trustProxy);
  setupLogging(app, env, {
    destination: options.logDestination,
    batcher: app.get<LogBatcher | null>(LOG_BATCHER, { strict: false }),
  });
  app.use(createLanguageMiddleware(options.languages));
  configureZodMessages();
  app.use(createSecurityHeaders(DOCS_PATH));
  app.use(cookieParser());
  if (env.corsOrigins.length > 0) {
    app.enableCors(buildCorsOptions(env.corsOrigins));
  }
  app.use(varyByApiVersion);
  app.enableVersioning(API_VERSIONING);
  app.useGlobalPipes(new SchemaValidationPipe());
  if (env.swaggerEnabled) {
    setupSwagger(app, API_DEFAULT_VERSION);
  }
}
