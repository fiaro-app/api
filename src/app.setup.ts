import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
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
import {
  DOCS_PATH,
  setupSwagger,
} from '@/shared/infrastructure/swagger/swagger.setup.js';

/**
 * Configuración HTTP global de la aplicación; la usan `main.ts` y las pruebas e2e.
 *
 * @remarks
 * El orden importa, cada middleware ve la petición en el orden en que se registra:
 * 1. `trust proxy`: define de dónde sale `req.ip`, que cuenta el rate limit.
 * 2. Cabeceras de seguridad, primero para que salgan también en errores, 404 y preflight.
 * 3. `cookie-parser`.
 * 4. CORS, solo si hay orígenes configurados.
 * 5. `Vary` y versionado por cabecera.
 * 6. Pipe de validación global.
 * 7. Swagger, solo si está activo.
 *
 * El rate limit es un guard global de `AppModule`, no un middleware.
 *
 * @param app - Aplicación de Nest sobre Express que se configura.
 */
export function configureApp(app: NestExpressApplication): void {
  const env = app.get<Env>(ENV);

  app.set('trust proxy', env.trustProxy);
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
