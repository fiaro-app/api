import { randomBytes } from 'node:crypto';
import type { Request } from 'express';

/** Cabecera con el identificador de la sesión de la app (uno por apertura de la app o de la pestaña). */
export const SESSION_ID_HEADER = 'X-Session-Id';

/** Cabecera con la pantalla en la que estaba la persona (la plantilla de la ruta, sin ids). */
export const CLIENT_SCREEN_HEADER = 'X-Client-Screen';

/** Cabecera estándar de W3C Trace Context: `00-<trace-id>-<span-id>-<flags>`. */
export const TRACEPARENT_HEADER = 'traceparent';

/** Lo que identifica de dónde viene una petición dentro del recorrido de una persona. */
export interface ClientTrace {
  /** El recorrido: todas las peticiones de una misma sesión de la app lo comparten. */
  readonly sessionId?: string;
  /** La pantalla desde la que se hizo (`/visit/[loanId]`). */
  readonly screen?: string;
  /** La traza (W3C): la envía la app o, si no, se crea una. */
  readonly traceId: string;
  /** Esta petición dentro de la traza. */
  readonly spanId: string;
}

/** Solo un UUID: lo que envía el cliente termina en el log, y no debe poder colar nada más. */
const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Solo una plantilla de ruta corta: letras, números, `_ - . /` y corchetes. */
const SCREEN = /^\/[\w\-./[\]]{0,63}$/;
const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const ZERO_TRACE = '0'.repeat(32);

const cache = new WeakMap<Request, ClientTrace>();

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

/**
 * La traza de una petición, a partir de lo que envió la app, validado con una lista blanca estricta:
 * un valor que no cumple su forma se ignora (no falla la petición) y la traza se crea nueva. Nada de
 * esto se usa para decidir permisos: es solo para encontrar el recorrido en el log (D-135).
 *
 * @param req - Petición de Express.
 */
export function clientTraceFor(req: Request): ClientTrace {
  const known = cache.get(req);
  if (known !== undefined) {
    return known;
  }
  const parsed = TRACEPARENT.exec(header(req, TRACEPARENT_HEADER) ?? '');
  const trace: ClientTrace = {
    sessionId: onlyIf(
      header(req, SESSION_ID_HEADER),
      SESSION_ID,
    )?.toLowerCase(),
    screen: onlyIf(header(req, CLIENT_SCREEN_HEADER), SCREEN),
    traceId:
      parsed?.[1] === ZERO_TRACE ? newTraceId() : (parsed?.[1] ?? newTraceId()),
    spanId: randomBytes(8).toString('hex'),
  };
  cache.set(req, trace);
  return trace;
}

/** @returns El valor si cumple su forma exacta; si no, `undefined`: lo inválido se ignora, no falla la petición. */
function onlyIf(value: string | undefined, shape: RegExp): string | undefined {
  return value !== undefined && shape.test(value) ? value : undefined;
}

function newTraceId(): string {
  return randomBytes(16).toString('hex');
}
