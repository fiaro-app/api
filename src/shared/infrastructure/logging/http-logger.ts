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
import { requestIdFor } from '@/shared/infrastructure/logging/request-id.js';
import { runWithRequestContext } from '@/shared/infrastructure/logging/request-context.js';

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
    customProps: (req) => ({
      route: matchedRoute(req),
      userId: getAuthenticatedSession(req)?.user.id,
    }),
  });
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = requestIdFor(req, res);
    req.id = requestId;
    log(req, res, () => {
      runWithRequestContext({ requestId }, next);
    });
  };
}
