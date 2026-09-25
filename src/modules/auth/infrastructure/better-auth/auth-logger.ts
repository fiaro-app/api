import { Logger } from '@nestjs/common';
import { inspect } from 'node:util';

const logger = new Logger('BetterAuth');

/** El texto de un argumento extra del log de better-auth: un error con su traza, o el valor legible. */
function describe(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  return typeof value === 'string' ? value : inspect(value);
}

/**
 * Escribe los logs de better-auth por el logger de Nest, que ya es Pino: salen en el mismo JSON
 * que el resto, con el `requestId` de la petición en curso, en lugar de una línea de texto suelta.
 *
 * @param level - Nivel con el que better-auth escribe.
 * @param message - Mensaje.
 * @param args - Datos extra: errores, objetos.
 */
export function logToNest(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  ...args: unknown[]
): void {
  const text = [message, ...args.map(describe)].join(' ');
  switch (level) {
    case 'error':
      logger.error(text);
      break;
    case 'warn':
      logger.warn(text);
      break;
    case 'info':
      logger.log(text);
      break;
    default:
      logger.debug(text);
  }
}
