import type { ApiError, ValidationIssue } from '@fiaro-app/contracts';
import { Injectable } from '@nestjs/common';
import type { IssuePayload } from '@/shared/infrastructure/filters/api-exception-payload.js';
import {
  codeForStatus,
  type ExceptionDetails,
} from '@/shared/infrastructure/filters/exception-details.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';

/**
 * Arma el cuerpo de error de la API (`ApiError` de `contracts`) con el mensaje en el idioma de la
 * petición. Lo usan el filtro global de excepciones y la respuesta de better-auth, para que
 * todos los errores tengan la misma forma.
 */
@Injectable()
export class ApiErrorFactory {
  constructor(private readonly translator: TranslationService) {}

  /** El idioma en que salen los mensajes de la petición en curso. */
  get language(): string {
    return this.translator.language;
  }

  /**
   * @param details - Estado, código y detalle del error.
   * @param path - Ruta de la petición, sin cadena de consulta.
   * @returns El cuerpo de la respuesta de error.
   */
  create(details: ExceptionDetails, path: string): ApiError {
    return {
      statusCode: details.statusCode,
      code: details.code,
      message: this.messageFor(details),
      path,
      timestamp: new Date().toISOString(),
      issues:
        details.issues?.map((issue) => this.translateIssue(issue)) ?? null,
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
