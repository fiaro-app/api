import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { toAuthRequest } from '@/modules/auth/infrastructure/better-auth/auth-request.js';

const BASE_URL = 'https://api.fiaro.co';

const requestOf = (overrides: Record<string, unknown> = {}) =>
  ({
    method: 'POST',
    headers: {},
    ip: '203.0.113.7',
    ...overrides,
  }) as unknown as Request;

const target = (body?: unknown) => ({
  baseUrl: BASE_URL,
  pathname: '/auth/sign-in/phone-number',
  body,
});

describe('toAuthRequest', () => {
  it('usa la URL base configurada y la ruta pedida, sin query string ni cabecera Host', () => {
    const request = toAuthRequest(
      requestOf({ headers: { host: 'sitio-ajeno.example' } }),
      target(),
    );

    expect(request.url).toBe('https://api.fiaro.co/auth/sign-in/phone-number');
  });

  it('conserva el método y las cabeceras del cliente, como la cookie y el origen', () => {
    const request = toAuthRequest(
      requestOf({
        method: 'GET',
        headers: { cookie: 'fiaro.session_token=abc', origin: 'fiaro://' },
      }),
      target(),
    );

    expect(request.method).toBe('GET');
    expect(request.headers.get('cookie')).toBe('fiaro.session_token=abc');
    expect(request.headers.get('origin')).toBe('fiaro://');
  });

  it('con cuerpo lo envía como JSON, aunque el cliente dijera otro content-type', async () => {
    const body = { phoneNumber: '+573001234567', password: 'clave-larga-1' };

    const request = toAuthRequest(
      requestOf({ headers: { 'content-type': 'text/plain' } }),
      target(body),
    );

    expect(request.headers.get('content-type')).toBe('application/json');
    await expect(request.json()).resolves.toEqual(body);
  });

  it('sin cuerpo no lleva body ni content-type', () => {
    const request = toAuthRequest(requestOf(), target());

    expect(request.body).toBeNull();
    expect(request.headers.has('content-type')).toBe(false);
  });

  it('descarta el largo original del cuerpo: ya no coincide con el que se reenvía', async () => {
    const request = toAuthRequest(
      requestOf({
        headers: { 'content-length': '9999', 'transfer-encoding': 'chunked' },
      }),
      target({ a: 1 }),
    );

    expect(request.headers.has('transfer-encoding')).toBe(false);
    expect(request.headers.get('content-length')).not.toBe('9999');
    await expect(request.json()).resolves.toEqual({ a: 1 });
  });

  it('la IP del cliente es la que resolvió Express y reemplaza a la que envíe el cliente', () => {
    const request = toAuthRequest(
      requestOf({
        ip: '203.0.113.7',
        headers: { 'x-fiaro-client-ip': '6.6.6.6' },
      }),
      target(),
    );

    expect(request.headers.get('x-fiaro-client-ip')).toBe('203.0.113.7');
  });

  it('si Express no resolvió ninguna IP, tampoco pasa la que envíe el cliente', () => {
    const request = toAuthRequest(
      requestOf({ ip: undefined, headers: { 'x-fiaro-client-ip': '6.6.6.6' } }),
      target(),
    );

    expect(request.headers.has('x-fiaro-client-ip')).toBe(false);
  });
});
