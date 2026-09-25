import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

/** Cabecera en la que viaja el identificador de la petición, de ida y de vuelta. */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Lo que se acepta como identificador enviado por el cliente. */
const ACCEPTED_REQUEST_ID = /^[\w.-]{8,64}$/;

/**
 * Identificador de una petición: el que envía el cliente en `X-Request-Id` si es razonable y, si
 * no, uno nuevo. Se devuelve en la misma cabecera de la respuesta, para que quien reporta un error
 * pueda decir cuál fue su petición y encontrarla en el log.
 *
 * @remarks
 * Solo se acepta un valor corto de letras, números, guion, guion bajo y punto: lo que envía el
 * cliente termina en el log y en una cabecera, y no debe poder colar saltos de línea ni texto
 * arbitrario.
 *
 * @param req - Petición de Express.
 * @param res - Respuesta de Express, donde se escribe la cabecera.
 * @returns El identificador de la petición.
 */
export function requestIdFor(req: Request, res: Response): string {
  const sent = req.headers['x-request-id'];
  const id =
    typeof sent === 'string' && ACCEPTED_REQUEST_ID.test(sent)
      ? sent
      : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}
