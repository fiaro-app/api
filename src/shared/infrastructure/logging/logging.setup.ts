import type { NestExpressApplication } from '@nestjs/platform-express';
import pino, { type DestinationStream } from 'pino';
import type { Env } from '@/config/env.js';
import { fanOutDestination } from '@/shared/infrastructure/logging/fan-out-destination.js';
import { createHttpLogger } from '@/shared/infrastructure/logging/http-logger.js';
import { createLogger } from '@/shared/infrastructure/logging/logger.factory.js';
import { PinoNestLogger } from '@/shared/infrastructure/logging/nest-logger.js';

/** Cómo se instalan los logs. */
export interface LoggingSetupOptions {
  /** Dónde se escribe; por defecto la salida estándar. Solo las pruebas lo cambian. */
  readonly destination?: DestinationStream;
  /**
   * Quien recibe además una copia de cada línea para llevarla a MongoDB (`LogBatcher`); sin él, o
   * con `null`, los logs solo salen por `destination`.
   */
  readonly batcher?: DestinationStream | null;
}

/**
 * Instala los logs en la aplicación: el logger de Nest pasa a ser Pino y cada petición queda
 * registrada por un middleware. Debe llamarse antes que cualquier otro `app.use(...)`.
 *
 * @remarks
 * Con un `batcher`, cada línea sale por la salida estándar (o `destination`) y además se le entrega
 * a él, por ese orden: la copia que va a MongoDB nunca retrasa ni impide la que siempre está.
 *
 * @param app - Aplicación de Nest sobre Express.
 * @param env - Configuración validada (`logLevel`).
 * @param options - Destino de los logs y copia hacia MongoDB.
 */
export function setupLogging(
  app: NestExpressApplication,
  env: Env,
  options: LoggingSetupOptions = {},
): void {
  const logger = createLogger({
    level: env.logLevel,
    destination: options.batcher
      ? fanOutDestination(
          options.destination ?? pino.destination(1),
          options.batcher,
        )
      : options.destination,
  });
  app.useLogger(new PinoNestLogger(logger));
  app.use(createHttpLogger(logger));
}
