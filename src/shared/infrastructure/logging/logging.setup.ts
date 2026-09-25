import type { NestExpressApplication } from '@nestjs/platform-express';
import type { DestinationStream } from 'pino';
import type { Env } from '@/config/env.js';
import { createHttpLogger } from '@/shared/infrastructure/logging/http-logger.js';
import { createLogger } from '@/shared/infrastructure/logging/logger.factory.js';
import { PinoNestLogger } from '@/shared/infrastructure/logging/nest-logger.js';

/** Cómo se instalan los logs. */
export interface LoggingSetupOptions {
  /** Dónde se escribe; por defecto la salida estándar. Solo las pruebas lo cambian. */
  readonly destination?: DestinationStream | undefined;
}

/**
 * Instala los logs en la aplicación: el logger de Nest pasa a ser Pino y cada petición queda
 * registrada por un middleware. Debe llamarse antes que cualquier otro `app.use(...)`.
 *
 * @param app - Aplicación de Nest sobre Express.
 * @param env - Configuración validada (`logLevel`).
 * @param options - Destino de los logs.
 */
export function setupLogging(
  app: NestExpressApplication,
  env: Env,
  options: LoggingSetupOptions = {},
): void {
  const logger = createLogger({
    level: env.logLevel,
    destination: options.destination,
  });
  app.useLogger(new PinoNestLogger(logger));
  app.use(createHttpLogger(logger));
}
