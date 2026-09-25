import type { Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import {
  errorLogFields,
  logLevelForResponse,
  matchedRoute,
  REQUEST_COMPLETED,
  requestPath,
  serializeRequest,
  serializeResponse,
} from '@/shared/infrastructure/logging/http-log-fields.js';

const fakeRequest = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'req-1234567',
    method: 'POST',
    originalUrl: '/auth/sign-in/phone-number',
    ip: '10.0.0.1',
    headers: {
      'user-agent': 'PostmanRuntime',
      cookie: 'fiaro.session_token=secreto',
      authorization: 'Bearer secreto',
    },
    route: { path: '/auth/sign-in/phone-number' },
    ...overrides,
  }) as unknown as Request;

const fakeResponse = (statusCode: number) =>
  ({ statusCode }) as unknown as Response;

describe('requestPath', () => {
  it('devuelve la ruta tal cual cuando no hay cadena de consulta', () => {
    expect(requestPath(fakeRequest({ originalUrl: '/loans/7' }))).toBe(
      '/loans/7',
    );
  });

  it('quita la cadena de consulta, que puede traer datos sensibles', () => {
    expect(
      requestPath(fakeRequest({ originalUrl: '/loans?token=secreto&page=2' })),
    ).toBe('/loans');
  });
});

describe('matchedRoute', () => {
  it('es la plantilla declarada, no la que se pidió', () => {
    const req = fakeRequest({
      originalUrl: '/loans/7',
      route: { path: '/loans/:id' },
    });

    expect(matchedRoute(req)).toBe('/loans/:id');
  });

  it.each([
    ['ninguna ruta atendió la petición', undefined],
    ['la petición se atendió sin ruta (null)', null],
    ['la ruta no trae un texto', { path: 42 }],
    ['la ruta no tiene path', {}],
    ['la ruta es un texto', 'no-es-un-objeto'],
  ])('no dice ruta cuando %s', (_caso, route) => {
    expect(matchedRoute(fakeRequest({ route }))).toBeUndefined();
  });
});

describe('serializeRequest', () => {
  it('escribe solo los campos elegidos, sin cabeceras', () => {
    expect(serializeRequest(fakeRequest())).toEqual({
      id: 'req-1234567',
      method: 'POST',
      path: '/auth/sign-in/phone-number',
      ip: '10.0.0.1',
      userAgent: 'PostmanRuntime',
    });
  });

  it('nunca deja la cookie ni la autorización en lo que se escribe', () => {
    expect(JSON.stringify(serializeRequest(fakeRequest()))).not.toContain(
      'secreto',
    );
  });
});

describe('serializeResponse', () => {
  it('escribe solo el estado, sin las cabeceras (llevan Set-Cookie)', () => {
    const res = {
      statusCode: 200,
      headers: { 'set-cookie': 'fiaro.session_token=secreto' },
    } as unknown as Response;

    expect(serializeResponse(res)).toEqual({ statusCode: 200 });
  });
});

describe('logLevelForResponse', () => {
  it.each([
    [200, 'info'],
    [204, 'info'],
    [302, 'info'],
    [399, 'info'],
    [400, 'warn'],
    [401, 'warn'],
    [404, 'warn'],
    [429, 'warn'],
    [499, 'warn'],
    [500, 'error'],
    [503, 'error'],
  ])('un %i se registra como %s', (status, level) => {
    expect(logLevelForResponse(fakeRequest(), fakeResponse(status))).toBe(
      level,
    );
  });

  it('una excepción se registra como error aunque el estado sea de éxito', () => {
    expect(
      logLevelForResponse(fakeRequest(), fakeResponse(200), new Error('boom')),
    ).toBe('error');
  });
});

describe('errorLogFields', () => {
  const fields = {
    res: { statusCode: 500 },
    err: { message: 'failed with status code 500' },
    responseTime: 3,
  };

  it('omite el error que la librería inventa para un 5xx sin excepción', () => {
    const error = new Error('failed with status code 500');

    expect(
      errorLogFields(fakeRequest(), fakeResponse(500), error, fields),
    ).toEqual({ res: { statusCode: 500 }, responseTime: 3 });
  });

  it('conserva el error cuando es uno de verdad', () => {
    const error = new Error('ECONNRESET');

    expect(
      errorLogFields(fakeRequest(), fakeResponse(500), error, fields),
    ).toBe(fields);
  });

  it('un error de otro estado tampoco se confunde con el inventado', () => {
    const error = new Error('failed with status code 500');

    expect(
      errorLogFields(fakeRequest(), fakeResponse(503), error, fields),
    ).toBe(fields);
  });
});

describe('REQUEST_COMPLETED', () => {
  it('es el mensaje de toda petición terminada', () => {
    expect(REQUEST_COMPLETED).toBe('request completed');
  });
});
