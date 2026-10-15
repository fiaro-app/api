import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import {
  errorLogFields,
  logLevelForResponse,
  matchedRoute,
  REQUEST_COMPLETED,
  serializeRequest,
  serializeResponse,
} from '@/shared/infrastructure/logging/http-log-fields.js';
import { clientTraceFor } from '@/shared/infrastructure/logging/client-trace.js';
import { requestIdFor } from '@/shared/infrastructure/logging/request-id.js';
import { runWithRequestContext } from '@/shared/infrastructure/logging/request-context.js';

/** Los campos de la traza de la petición que van a la línea de log (`traceId`, `spanId`, `sessionId`, `screen`). */
function traceFieldsOf(req: Request): Record<string, string | undefined> {
  const { traceId, spanId, sessionId, screen } = clientTraceFor(req);
  return { traceId, spanId, sessionId, screen };
}

/**
 * Lo que el filtro de excepciones dejó en la respuesta para el log: el código único del error, qué
 * es, qué mirar y lo que dijo la excepción original (D-134). Vacío si la petición no falló.
 *
 * @param res - Respuesta de Express.
 */
function errorLogOf(res: Response): Record<string, unknown> {
  const locals: unknown = res.locals.errorLog;
  return typeof locals === 'object' && locals !== null ? { ...locals } : {};
}

/**
 * Middleware que escribe una línea de log por cada petición terminada: método, ruta pedida,
 * plantilla de la ruta, estado, tiempo de respuesta, identificador de la petición, IP, navegador
 * y, si la petición traía una sesión, la persona (`userId`).
 *
 * @remarks
 * Va primero en la cadena de middlewares para que también queden registradas las peticiones que
 * otro middleware responde por su cuenta (una petición de CORS, por ejemplo) o que el rate limit
 * rechaza. Deja el `requestId` en el contexto de la petición, así cualquier otro log escrito
 * mientras se atiende (el de un caso de uso, el de Nest) lo lleva también.
 *
 * `route` y `userId` se calculan al terminar la petición: Express decide la ruta y el guard
 * identifica la sesión después de que la petición empieza. El identificador se asigna antes de
 * llamar a pino-http (`requestIdFor`), que respeta el `req.id` que ya existe.
 *
 * @param logger - Logger de la aplicación.
 * @returns El middleware de Express.
 */
export function createHttpLogger(logger: Logger): RequestHandler {
  const log = pinoHttp<Request, Response>({
    logger,
    wrapSerializers: false,
    serializers: { req: serializeRequest, res: serializeResponse },
    customLogLevel: logLevelForResponse,
    customSuccessMessage: () => REQUEST_COMPLETED,
    customErrorMessage: () => REQUEST_COMPLETED,
    customErrorObject: errorLogFields,
    customProps: (req, res) => ({
      route: matchedRoute(req),
      userId: getAuthenticatedSession(req)?.user.id,
      ...traceFieldsOf(req),
      ...errorLogOf(res),
    }),
  });
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = requestIdFor(req, res);
    req.id = requestId;
    log(req, res, () => {
      runWithRequestContext({ requestId, ...clientTraceFor(req) }, next);
    });
  };
}
