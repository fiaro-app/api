import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { inspect } from 'node:util';
import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { describeException } from '@/shared/infrastructure/filters/exception-details.js';
import { markLocalized } from '@/shared/infrastructure/i18n/localized-response.js';
import { requestPath } from '@/shared/infrastructure/logging/http-log-fields.js';

/**
 * Filtro global de excepciones: toda respuesta de error de la API sale de aquí con la forma de
 * `ApiError` (`contracts`) y el mensaje en el idioma de la petición.
 *
 * @remarks
 * Ni el mensaje de la excepción ni su traza salen en la respuesta: el texto viene siempre del
 * catálogo, así un error interno no filtra detalles. Los errores del servidor (5xx) se escriben
 * en el log con su traza y el `requestId`; los del cliente (4xx) ya quedan en la línea de la
 * petición.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly errors: ApiErrorFactory) {}

  /**
   * @param exception - Lo que se lanzó durante la petición.
   * @param host - Contexto de la petición.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const details = describeException(exception);

    this.errors.annotate(res, details);
    if (details.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception : inspect(exception),
      );
    }
    if (res.headersSent) {
      res.end();
      return;
    }
    markLocalized(res, this.errors.language);
    res
      .status(details.statusCode)
      .json(this.errors.create(details, requestPath(req)));
  }
}
