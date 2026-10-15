import { HttpException, HttpStatus } from '@nestjs/common';
import {
  DomainError,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';
import {
  type ApiExceptionPayload,
  ApiExceptionPayloadSchema,
  type IssuePayload,
} from '@/shared/infrastructure/filters/api-exception-payload.js';
import {
  ERROR_CODE_BY_API_CODE,
  GENERIC_ERROR_CODES,
  PROVIDER_ERROR_CODES,
} from '@/shared/domain/errors/error-catalog.js';
import type { MessageParams } from '@/shared/infrastructure/i18n/message-catalog.js';

/** Lo que hace falta saber de una excepción para responder: su estado y el contenido del error. */
export interface ExceptionDetails {
  /** Estado HTTP de la respuesta. */
  readonly statusCode: number;
  /** Código estable del error. */
  readonly code: string;
  /** Valores para los marcadores del texto del error. */
  readonly params?: MessageParams;
  /** Detalle por campo de un `VALIDATION_FAILED`. */
  readonly issues?: readonly IssuePayload[];
  /** Código único del catálogo (`error-catalog.ts`, D-134): distingue errores que comparten `code`. */
  readonly errorCode: string;
  /** Lo que dijo la excepción original: solo para el log y para `debug` fuera de producción, nunca para producción. */
  readonly cause?: string;
}

/** Los códigos generales de `ErrorCodeSchema` y los de HTTP que ningún módulo pone por su cuenta. */
const CODE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

/**
 * El estado HTTP de cada categoría de error de dominio: el dominio dice qué clase de fallo es y
 * aquí se decide cómo se responde. Una categoría nueva sin estado no compila.
 */
const STATUS_BY_KIND: Readonly<Record<DomainErrorKind, number>> = {
  INVALID: HttpStatus.BAD_REQUEST,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  RULE_VIOLATED: HttpStatus.UNPROCESSABLE_ENTITY,
  UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
};

/**
 * El código de error que corresponde a un estado HTTP, para las excepciones que no traen uno
 * (el 404 de una ruta que no existe, el 429 del rate limit).
 *
 * @param status - Estado HTTP.
 */
export function codeForStatus(status: number): string {
  return (
    CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN')
  );
}

/**
 * El estado de un error que no es de Nest pero trae uno, como los de `body-parser` (JSON mal
 * formado, cuerpo demasiado grande).
 */
function statusOfHttpError(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  ) {
    return error.statusCode;
  }
  return undefined;
}

/** El código único de un error que no es de una clase de dominio: el de su `code`, o el de «sin clasificar». */
export function errorCodeFor(code: string): string {
  return ERROR_CODE_BY_API_CODE[code] ?? GENERIC_ERROR_CODES.unknown;
}

/** Cada proveedor externo y cómo se reconoce su error por el nombre de su clase o su código. */
const PROVIDER_SIGNATURES: readonly [
  keyof typeof PROVIDER_ERROR_CODES,
  RegExp,
][] = [
  [
    'DATABASE',
    /^(PrismaClient|PrismaClientKnownRequestError|PrismaClientInitializationError|PrismaClientUnknownRequestError|PrismaClientRustPanicError|PrismaClientValidationError)/,
  ],
  ['MONGO', /^Mongo/],
  [
    'REDIS',
    /^(ReplyError|MaxRetriesPerRequestError|AbortError|ClusterAllFailedError)$/,
  ],
  [
    'STORAGE',
    /(S3ServiceException|S3Error|NoSuchBucket|AccessDenied|CredentialsProviderError)/,
  ],
  ['EMAIL', /^(ResendError|Resend)/],
  ['PUSH', /^Expo/],
  ['CLOUDFLARE', /^Turnstile/],
];

/**
 * Qué proveedor externo causó un error inesperado, por el nombre de su clase (`PrismaClient…`,
 * `MongoServerError`…): así un 500 dice «PostgreSQL» o «el almacenamiento» y no solo «interno».
 *
 * @param exception - Lo que se lanzó.
 * @returns El código único del proveedor, o el genérico de error interno.
 */
export function providerErrorCode(exception: unknown): string {
  const name =
    typeof exception === 'object' && exception !== null
      ? exception.constructor.name
      : '';
  const hit = PROVIDER_SIGNATURES.find(([, signature]) => signature.test(name));
  return hit === undefined
    ? GENERIC_ERROR_CODES.internal
    : PROVIDER_ERROR_CODES[hit[0]];
}

/** @param exception - Lo que se lanzó. @returns Su mensaje recortado, para el log y `debug` en desarrollo. */
function causeOf(exception: unknown): string | undefined {
  const text = exception instanceof Error ? exception.message : undefined;
  return text === undefined || text === '' ? undefined : text.slice(0, 300);
}

function describeDomainError(error: DomainError): ExceptionDetails {
  return {
    errorCode: error.errorCode,
    cause: causeOf(error),
    statusCode: STATUS_BY_KIND[error.kind],
    code: error.code,
    params: error.params,
    issues: error.issues?.map(({ path, message, params }) => ({
      path: [...path],
      message,
      params,
    })),
  };
}

function payloadOf(exception: HttpException): ApiExceptionPayload {
  return (
    ApiExceptionPayloadSchema.safeParse(exception.getResponse()).data ?? {}
  );
}

/**
 * Qué responder ante una excepción.
 *
 * @remarks
 * Un error de dominio (`DomainError`) toma su estado de su categoría (`kind`) y su `code`, sus
 * `params` y sus `issues` de sí mismo. Una excepción de Nest conserva su estado y toma del cuerpo
 * que se le pasó el `code`, los `params` y los `issues` (`ApiExceptionPayloadSchema`); sin
 * `code`, se deduce del estado. Un
 * error con estado HTTP de otra librería lo conserva y también se deduce su código. Cualquier
 * otra cosa que se lance es un error del servidor (500 `INTERNAL_ERROR`): su mensaje nunca sale
 * en la respuesta.
 *
 * @param exception - Lo que se lanzó.
 */
export function describeException(exception: unknown): ExceptionDetails {
  if (exception instanceof DomainError) {
    return describeDomainError(exception);
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const { code, params, issues } = payloadOf(exception);
    const resolved = code ?? codeForStatus(statusCode);
    return {
      statusCode,
      code: resolved,
      errorCode: errorCodeFor(resolved),
      cause: causeOf(exception),
      params,
      issues,
    };
  }
  const statusCode =
    statusOfHttpError(exception) ?? HttpStatus.INTERNAL_SERVER_ERROR;
  const code = codeForStatus(statusCode);
  return {
    statusCode,
    code,
    errorCode:
      statusCode >= 500 ? providerErrorCode(exception) : errorCodeFor(code),
    cause: causeOf(exception),
  };
}
