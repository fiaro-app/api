import type { IncomingMessage } from 'node:http';
import { VersioningType, type VersioningOptions } from '@nestjs/common';
import type { RequestHandler } from 'express';

/** Cabecera con la que el cliente elige la versión de la API. */
export const API_VERSION_HEADER = 'API-Version';

/** Versión que se sirve cuando la petición no trae la cabecera; la heredan las rutas sin versión. */
export const API_DEFAULT_VERSION = '1';

/** Versión pedida por la petición: la de la cabecera o, si falta o viene vacía, la por defecto. */
export function extractApiVersion(request: unknown): string {
  const value = (request as IncomingMessage).headers[
    API_VERSION_HEADER.toLowerCase()
  ];
  return typeof value === 'string' && value !== ''
    ? value
    : API_DEFAULT_VERSION;
}

/**
 * Versionado por cabecera con extractor propio (`CUSTOM`).
 *
 * @remarks
 * El tipo `HEADER` de Nest no aplica `defaultVersion` cuando falta la cabecera: toda petición
 * sin ella respondería 404, igual que una ruta que declara `version: '1'`.
 */
export const API_VERSIONING = {
  type: VersioningType.CUSTOM,
  extractor: extractApiVersion,
  defaultVersion: API_DEFAULT_VERSION,
} as const satisfies VersioningOptions;

/** Avisa a las caches con `Vary` de que la respuesta depende de la cabecera de versión. */
export const varyByApiVersion: RequestHandler = (_req, res, next) => {
  res.vary(API_VERSION_HEADER);
  next();
};
