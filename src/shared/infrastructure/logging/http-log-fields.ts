import type { Request, Response } from 'express';
import type { LevelWithSilent } from 'pino';

/** Mensaje de toda petición terminada, con éxito o con error: así se pueden buscar todas juntas. */
export const REQUEST_COMPLETED = 'request completed';

/**
 * La ruta pedida sin la cadena de consulta, que puede traer datos que no deben quedar en el log
 * (un token en la URL, por ejemplo).
 *
 * @param req - Petición de Express.
 */
export function requestPath(req: Request): string {
  const url = req.originalUrl;
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

/**
 * La plantilla de la ruta que atendió la petición (`/loans/:id`), que agrupa todas las llamadas a
 * la misma ruta aunque cambie el id.
 *
 * @remarks
 * Express la decide después de que la petición empieza; por eso se lee al terminar (ver
 * `createHttpLogger`) y no en `serializeRequest`, que se ejecuta al empezar.
 *
 * @param req - Petición de Express.
 * @returns La plantilla, o `undefined` si ninguna ruta atendió la petición (un 404, por ejemplo).
 */
export function matchedRoute(req: Request): string | undefined {
  const route: unknown = req.route;
  if (typeof route !== 'object' || route === null || !('path' in route)) {
    return undefined;
  }
  return typeof route.path === 'string' ? route.path : undefined;
}

/**
 * Los campos de una petición que van al log, elegidos uno por uno: nunca cabeceras (llevan la
 * cookie de sesión), cuerpo ni cadena de consulta.
 *
 * @param req - Petición de Express.
 */
export function serializeRequest(req: Request) {
  return {
    id: req.id,
    method: req.method,
    path: requestPath(req),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Los campos de una respuesta que van al log: solo el estado, nunca las cabeceras (llevan
 * `Set-Cookie`).
 *
 * @param res - Respuesta de Express.
 */
export function serializeResponse(res: Response) {
  return { statusCode: res.statusCode };
}

/**
 * Nivel con el que se registra una petición terminada: los errores del servidor (5xx) y las
 * excepciones son `error`, los rechazos del cliente (4xx) son `warn` y el resto `info`.
 *
 * @param _req - Petición de Express (no se usa).
 * @param res - Respuesta de Express.
 * @param error - Excepción que interrumpió la petición, si la hubo.
 */
export function logLevelForResponse(
  _req: Request,
  res: Response,
  error?: Error,
): LevelWithSilent {
  if (error !== undefined || res.statusCode >= 500) {
    return 'error';
  }
  return res.statusCode >= 400 ? 'warn' : 'info';
}

/**
 * Lo que se escribe de una petición terminada con error.
 *
 * @remarks
 * Cuando un 5xx no trae ninguna excepción, pino-http inventa un `Error` («failed with status
 * code 500») cuya traza apunta a la propia librería, no a la causa: se omite. La excepción real
 * la escribe el filtro de Nest en otra línea, con el mismo `requestId`.
 *
 * @param _req - Petición de Express (no se usa).
 * @param res - Respuesta de Express.
 * @param error - Error que pino-http asocia a la petición.
 * @param fields - Campos que pino-http iba a escribir (`res`, `err`, `responseTime`).
 * @returns Los mismos campos, sin `err` si era el error inventado.
 */
export function errorLogFields(
  _req: Request,
  res: Response,
  error: Error,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  if (error.message !== `failed with status code ${String(res.statusCode)}`) {
    return fields;
  }
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => key !== 'err'),
  );
}
