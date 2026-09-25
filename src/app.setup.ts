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
import { setupLogging } from '@/shared/infrastructure/logging/logging.setup.js';
import {
  DOCS_PATH,
  setupSwagger,
} from '@/shared/infrastructure/swagger/swagger.setup.js';

/** Opciones de `configureApp` que solo cambian las pruebas. */
export interface AppSetupOptions {
  /** Dónde se escriben los logs; por defecto la salida estándar. */
  readonly logDestination?: DestinationStream;
}

/**
 * Configuración HTTP global de la aplicación; la usan `main.ts` y las pruebas e2e.
 *
 * @remarks
 * El orden importa, cada middleware ve la petición en el orden en que se registra:
 * 1. `trust proxy`: define de dónde sale `req.ip`, que cuenta el rate limit y sale en el log.
 * 2. Logs: el logger de Nest pasa a Pino y cada petición queda registrada. Va antes que todo lo
 *    demás para que también queden las que otro middleware responde por su cuenta (preflight).
 * 3. Cabeceras de seguridad, primero de las demás para que salgan también en errores, 404 y
 *    preflight.
 * 4. `cookie-parser`.
 * 5. CORS, solo si hay orígenes configurados.
 * 6. `Vary` y versionado por cabecera.
 * 7. Pipe de validación global.
 * 8. Swagger, solo si está activo.
 *
 * El rate limit es un guard global de `AppModule`, no un middleware.
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
  setupLogging(app, env, { destination: options.logDestination });
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
