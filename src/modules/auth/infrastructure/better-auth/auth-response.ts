import { ErrorCodeSchema } from '@fiaro-app/contracts';
import type { Response } from 'express';
import { withoutSessionToken } from '@/modules/auth/infrastructure/better-auth/auth-response-body.js';

/** Cabeceras de la respuesta de better-auth que Express calcula por su cuenta o maneja aparte. */
const OWN_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
  'content-length',
  'transfer-encoding',
  'connection',
  'set-cookie',
  'vary',
]);

const RATE_LIMITED_MESSAGE =
  'Demasiadas solicitudes. Intenta de nuevo en unos segundos.';

/** Segundos de espera que se anuncian si better-auth no dice cuántos. */
const DEFAULT_RETRY_AFTER_SECONDS = '60';

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

/** Traduce el 429 de better-auth al contrato de errores de la API, con `Retry-After` estándar. */
function writeRateLimited(res: Response, response: globalThis.Response): void {
  res.setHeader(
    'Retry-After',
    response.headers.get('x-retry-after') ?? DEFAULT_RETRY_AFTER_SECONDS,
  );
  res.type('application/json').end(
    JSON.stringify({
      code: ErrorCodeSchema.enum.RATE_LIMITED,
      message: RATE_LIMITED_MESSAGE,
    }),
  );
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
 * Escribe en la respuesta de Express lo que respondió better-auth.
 *
 * @remarks
 * Copia el estado, el cuerpo, las cabeceras y cada cookie en su propio `Set-Cookie`. El token de
 * sesión se quita del cuerpo: solo viaja en la cookie `HttpOnly`. La respuesta lleva siempre
 * `Cache-Control: no-store` (trae la cookie de sesión y datos personales) y se escribe con
 * `end()`, no con `send()`: Express agregaría un ETag y un cliente podría recibir un 304 sin
 * cuerpo en lugar de la sesión. El 429 de better-auth se reemplaza por el error estándar
 * `RATE_LIMITED` con `Retry-After`.
 *
 * @param res - Respuesta de Express.
 * @param response - Respuesta de better-auth.
 */
export async function writeAuthResponse(
  res: Response,
  response: globalThis.Response,
): Promise<void> {
  res.status(response.status);
  copyHeaders(res, response);
  if (response.status === 429) {
    writeRateLimited(res, response);
    return;
  }
  res.end(await bodyWithoutToken(response));
}
