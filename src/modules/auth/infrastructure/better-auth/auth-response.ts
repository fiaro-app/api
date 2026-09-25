import { ErrorCodeSchema } from '@fiaro-app/contracts';
import type { Response } from 'express';
import { z } from 'zod';
import { withoutSessionToken } from '@/modules/auth/infrastructure/better-auth/auth-response-body.js';
import type { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { codeForStatus } from '@/shared/infrastructure/filters/exception-details.js';
import { markLocalized } from '@/shared/infrastructure/i18n/localized-response.js';
import { requestPath } from '@/shared/infrastructure/logging/http-log-fields.js';

/** Cabeceras de la respuesta de better-auth que Express calcula por su cuenta o maneja aparte. */
const OWN_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'content-length',
  'transfer-encoding',
  'connection',
  'set-cookie',
  'vary',
]);

/** Segundos de espera que se anuncian si better-auth no dice cuántos. */
const DEFAULT_RETRY_AFTER_SECONDS = '60';

/** Lo único que se toma del error de better-auth: su código; el texto lo escribe la API. */
const UpstreamErrorSchema = z.object({ code: z.string() });

function copyHeaders(res: Response, response: globalThis.Response): void {
  res.setHeader('Cache-Control', 'no-store');
  for (const [name, value] of response.headers) {
    if (!OWN_RESPONSE_HEADERS.has(name)) {
      res.setHeader(name, value);
    }
  }
  for (const cookie of response.headers.getSetCookie()) {
    res.append('Set-Cookie', cookie);
  }
  const vary = response.headers.get('vary');
  if (vary) {
    res.vary(vary);
  }
}

/**
 * El cuerpo de la respuesta de better-auth sin el token de sesión, que solo viaja en la cookie.
 * Lo que no es JSON, o no se puede leer como JSON, pasa tal cual.
 */
async function bodyWithoutToken(
  response: globalThis.Response,
): Promise<string> {
  const text = await response.text();
  if (!response.headers.get('content-type')?.includes('application/json')) {
    return text;
  }
  try {
    const body: unknown = JSON.parse(text);
    return JSON.stringify(withoutSessionToken(body));
  } catch {
    return text;
  }
}

/**
 * El código de un error de better-auth (`INVALID_PHONE_NUMBER_OR_PASSWORD`), o el que corresponde
 * a su estado cuando el cuerpo no lo trae. Un 429 es siempre `RATE_LIMITED` (el rate limit de
 * better-auth no lleva código) salvo el bloqueo de un celular, que es de la API y trae el suyo,
 * `SIGN_IN_LOCKED`.
 */
async function errorCodeOf(response: globalThis.Response): Promise<string> {
  const fallback =
    response.status === 429
      ? ErrorCodeSchema.enum.RATE_LIMITED
      : codeForStatus(response.status);
  try {
    const body: unknown = await response.json();
    const code = UpstreamErrorSchema.safeParse(body).data?.code;
    if (response.status === 429) {
      return code === ErrorCodeSchema.enum.SIGN_IN_LOCKED ? code : fallback;
    }
    return code ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Escribe un error de better-auth con la forma de error de la API y el mensaje en el idioma de
 * la petición. El 429 lleva `Retry-After` estándar.
 */
async function writeError(
  res: Response,
  response: globalThis.Response,
  errors: ApiErrorFactory,
): Promise<void> {
  if (response.status === 429) {
    res.setHeader(
      'Retry-After',
      response.headers.get('x-retry-after') ?? DEFAULT_RETRY_AFTER_SECONDS,
    );
  }
  const details = {
    statusCode: response.status,
    code: await errorCodeOf(response),
  };
  markLocalized(res, errors.language);
  res
    .type('application/json')
    .end(JSON.stringify(errors.create(details, requestPath(res.req))));
}

/**
 * Escribe en la respuesta de Express lo que respondió better-auth.
 *
 * @remarks
 * Copia el estado, el cuerpo, las cabeceras y cada cookie en su propio `Set-Cookie`. El token de
 * sesión se quita del cuerpo: solo viaja en la cookie `HttpOnly`. La respuesta lleva siempre
 * `Cache-Control: no-store` (trae la cookie de sesión y datos personales) y se escribe con
 * `end()`, no con `send()`: Express agregaría un ETag y un cliente podría recibir un 304 sin
 * cuerpo en lugar de la sesión. Un error (4xx o 5xx) no pasa tal cual: better-auth escribe sus
 * mensajes en inglés, así que solo se toma su `code` y el mensaje sale del catálogo, con la forma
 * de error de la API. El 429 se reemplaza por `RATE_LIMITED` (o `SIGN_IN_LOCKED`) con `Retry-After`.
 *
 * @param res - Respuesta de Express.
 * @param response - Respuesta de better-auth.
 * @param errors - Fábrica del cuerpo de error, con el idioma de la petición.
 */
export async function writeAuthResponse(
  res: Response,
  response: globalThis.Response,
  errors: ApiErrorFactory,
): Promise<void> {
  res.status(response.status);
  copyHeaders(res, response);
  if (response.status >= 400) {
    await writeError(res, response, errors);
    return;
  }
  res.end(await bodyWithoutToken(response));
}
