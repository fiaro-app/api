import type { ApiError, ValidationIssue } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { errorCodeInfo } from '@/shared/domain/errors/error-catalog.js';
import type { IssuePayload } from '@/shared/infrastructure/filters/api-exception-payload.js';
import {
  codeForStatus,
  type ExceptionDetails,
} from '@/shared/infrastructure/filters/exception-details.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';
import { currentRequestContext } from '@/shared/infrastructure/logging/request-context.js';

/**
 * Lo que solo se ve fuera de producción: qué es el error, qué mirar y lo que dijo la excepción
 * original. En producción nunca sale: la explicación va únicamente al log.
 */
export interface ApiErrorDebug {
  readonly title: string | null;
  readonly hint: string | null;
  readonly cause: string | null;
}

/**
 * El error de la API (`ApiError` de `contracts`) más lo que agrega D-134: el código único
 * (`errorCode`, siempre), el identificador de la petición (`requestId`, siempre) y, solo fuera de
 * producción, `debug`.
 */
export interface ApiErrorResponse extends ApiError {
  readonly errorCode: string;
  readonly requestId: string | null;
  readonly debug?: ApiErrorDebug;
}

/**
 * Arma el cuerpo de error de la API con el mensaje en el idioma de la petición. Lo usan el filtro
 * global de excepciones y la respuesta de better-auth, para que todos los errores tengan la
 * misma forma.
 *
 * @remarks
 * `errorCode` y `requestId` van en toda respuesta de error: son lo que la app y soporte usan para
 * decidir qué mostrar y para encontrar la petición en el log. La explicación (`debug`) solo sale
 * si `NODE_ENV` no es producción.
 */
@Injectable()
export class ApiErrorFactory {
  constructor(
    private readonly translator: TranslationService,
    @Inject(ENV) private readonly env: Pick<Env, 'nodeEnv'>,
  ) {}

  /** El idioma en que salen los mensajes de la petición en curso. */
  get language(): string {
    return this.translator.language;
  }

  /**
   * @param details - Estado, código y detalle del error.
   * @param path - Ruta de la petición, sin cadena de consulta.
   * @returns El cuerpo de la respuesta de error.
   */
  create(details: ExceptionDetails, path: string): ApiErrorResponse {
    return {
      statusCode: details.statusCode,
      code: details.code,
      errorCode: details.errorCode,
      message: this.messageFor(details),
      path,
      timestamp: new Date().toISOString(),
      issues:
        details.issues?.map((issue) => this.translateIssue(issue)) ?? null,
      requestId: currentRequestContext()?.requestId ?? null,
      ...this.debugFor(details),
    };
  }

  /** `debug` solo fuera de producción; en producción, nada. */
  private debugFor(details: ExceptionDetails): { debug?: ApiErrorDebug } {
    if (this.env.nodeEnv === 'production') {
      return {};
    }
    const info = errorCodeInfo(details.errorCode);
    return {
      debug: {
        title: info?.title ?? null,
        hint: info?.hint ?? null,
        cause: details.cause ?? null,
      },
    };
  }

  /**
   * Deja en la respuesta lo que el log de la petición debe decir del error: el código único, qué
   * es y qué mirar. Va siempre al log, también en producción.
   *
   * @param res - Respuesta de Express.
   * @param details - El error que se responde.
   */
  annotate(res: Response, details: ExceptionDetails): void {
    const info = errorCodeInfo(details.errorCode);
    res.locals.errorLog = {
      errorCode: details.errorCode,
      errorTitle: info?.title,
      errorHint: info?.hint,
      errorCause: details.cause,
    };
  }

  /**
   * El texto del código, o el del estado si el código no tiene texto (un código nuevo de una
   * librería), o el genérico si tampoco: nunca queda sin mensaje.
   */
  private messageFor({ code, statusCode, params }: ExceptionDetails): string {
    return (
      this.translator.find(`errors.${code}`, params) ??
      this.translator.find(`errors.${codeForStatus(statusCode)}`) ??
      this.translator.translate('errors.UNKNOWN')
    );
  }

  /** Un mensaje que es clave del catálogo se traduce; uno que ya es texto sale tal cual. */
  private translateIssue({
    path,
    message,
    params,
  }: IssuePayload): ValidationIssue {
    return { path, message: this.translator.find(message, params) ?? message };
  }
}
