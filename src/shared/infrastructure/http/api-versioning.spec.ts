import type { IncomingMessage } from 'node:http';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import {
  API_DEFAULT_VERSION,
  API_VERSION_HEADER,
  API_VERSIONING,
  extractApiVersion,
  varyByApiVersion,
} from './api-versioning.js';

/** Una petición con las cabeceras dadas; Node las entrega con el nombre en minúsculas. */
const requestWith = (headers: IncomingMessage['headers']) => ({ headers });

describe('extractApiVersion', () => {
  it('devuelve la versión que pide la cabecera', () => {
    expect(extractApiVersion(requestWith({ 'api-version': '2' }))).toBe('2');
  });

  it('sirve la versión por defecto cuando la cabecera falta', () => {
    expect(extractApiVersion(requestWith({}))).toBe(API_DEFAULT_VERSION);
  });

  it('sirve la versión por defecto cuando la cabecera viene vacía', () => {
    expect(extractApiVersion(requestWith({ 'api-version': '' }))).toBe(
      API_DEFAULT_VERSION,
    );
  });

  it('no interpreta el valor: una versión que no existe llega tal cual y ninguna ruta la sirve', () => {
    expect(extractApiVersion(requestWith({ 'api-version': 'abc' }))).toBe(
      'abc',
    );
  });
});

describe('API_VERSIONING', () => {
  it('usa el extractor de la cabecera y asigna la versión por defecto a las rutas sin versión', () => {
    expect(API_VERSIONING.extractor).toBe(extractApiVersion);
    expect(API_VERSIONING.defaultVersion).toBe(API_DEFAULT_VERSION);
  });
});

describe('varyByApiVersion', () => {
  it('avisa a las caches que la respuesta depende de la versión y sigue con la petición', () => {
    const vary = vi.fn();
    const next = vi.fn();

    varyByApiVersion({} as Request, { vary } as unknown as Response, next);

    expect(vary).toHaveBeenCalledWith(API_VERSION_HEADER);
    expect(next).toHaveBeenCalledOnce();
  });
});
