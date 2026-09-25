import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { CLIENT_IP_HEADER } from '@/modules/auth/infrastructure/better-auth/auth.constants.js';

/** Qué se le pide a better-auth. */
export interface AuthRequestTarget {
  /** Origen configurado de la API (`BETTER_AUTH_URL`), nunca el de la cabecera `Host`. */
  readonly baseUrl: string;
  /** Ruta completa de better-auth, sin query string: `/auth/sign-in/phone-number`. */
  readonly pathname: string;
  /** Cuerpo ya validado, o `undefined` en las rutas sin cuerpo. */
  readonly body?: unknown;
}

/**
 * Arma la petición que recibe better-auth a partir de la que ya parseó y validó Nest.
 *
 * @remarks
 * - Conserva las cabeceras del cliente (la cookie, `Origin`, `expo-origin`), salvo las del cuerpo
 *   original, que ya no coinciden con el que se reenvía.
 * - Escribe la IP que resolvió Express en {@link CLIENT_IP_HEADER} y descarta la que enviara el
 *   cliente: de ahí sale el rate limit de better-auth.
 * - El cuerpo viaja como JSON; sin cuerpo (ver sesión, cerrar sesión) no lleva `content-type`.
 *
 * @param req - Petición de Express.
 * @param target - Ruta, cuerpo y origen de la petición nueva.
 */
export function toAuthRequest(
  req: Request,
  { baseUrl, pathname, body }: AuthRequestTarget,
): globalThis.Request {
  const headers = fromNodeHeaders(req.headers);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete('content-length');
  headers.delete('transfer-encoding');
  if (req.ip) {
    headers.set(CLIENT_IP_HEADER, req.ip);
  }
  if (body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  return new globalThis.Request(new URL(pathname, baseUrl), {
    method: req.method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
