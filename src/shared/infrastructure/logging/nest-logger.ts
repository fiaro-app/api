import type { LoggerService } from '@nestjs/common';
import type { Logger } from 'pino';

type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/** Una línea de una traza de pila (`    at función (archivo:1:1)`). */
const STACK_LINE = /\n[ \t]+at /;

/** Lo que Nest agrega al mensaje: el contexto (la clase que escribe) y, en errores, la traza. */
interface Extras {
  readonly context?: string;
  readonly stack?: string;
}

/**
 * Interpreta los parámetros extra de una llamada al logger de Nest: `(mensaje, contexto)` o, en
 * errores, `(mensaje, traza, contexto)`.
 */
function readExtras(params: readonly unknown[]): Extras {
  const [first, second] = params.filter((p) => typeof p === 'string');
  if (second !== undefined) {
    return { stack: first, context: second };
  }
  if (first === undefined) {
    return {};
  }
  return STACK_LINE.test(first) ? { stack: first } : { context: first };
}

/** El mensaje como campos del registro: un objeto se abre en campos, cualquier otro va en `message`. */
function fieldsOf(message: unknown): Record<string, unknown> {
  return typeof message === 'object' &&
    message !== null &&
    !Array.isArray(message)
    ? { ...message }
    : { message };
}

/**
 * Logger de Nest que escribe con Pino: los avisos del propio framework (arranque, rutas
 * registradas, excepciones no controladas) salen en el mismo JSON que el resto de la aplicación.
 *
 * @remarks
 * Se instala con `app.useLogger(...)`. Con `bufferLogs` en `main.ts`, lo que Nest escribe antes
 * de que exista queda en memoria y sale por aquí en cuanto se instala.
 */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  /** Información general (`Logger.log`). */
  log(message: unknown, ...params: unknown[]): void {
    this.write('info', message, params);
  }

  /** Un error, con su traza y contexto si Nest los pasa. */
  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }

  /** Algo que conviene revisar. */
  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  /** Detalle para depurar. */
  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }

  /** El nivel más detallado de Nest (`verbose`), que en Pino es `trace`. */
  verbose(message: unknown, ...params: unknown[]): void {
    this.write('trace', message, params);
  }

  /** Un error que detiene la aplicación. */
  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  private write(
    level: Level,
    message: unknown,
    params: readonly unknown[],
  ): void {
    const extras = readExtras(params);
    if (message instanceof Error) {
      this.logger[level]({ ...extras, err: message }, message.message);
    } else if (typeof message === 'string') {
      this.logger[level](extras, message);
    } else {
      this.logger[level]({ ...extras, ...fieldsOf(message) });
    }
  }
}
