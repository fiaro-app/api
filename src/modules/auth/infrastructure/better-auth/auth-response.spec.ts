import { describe, expect, it } from 'vitest';
import { writeAuthResponse } from '@/modules/auth/infrastructure/better-auth/auth-response.js';
import { FakeExpressResponse } from '@test/support/fake-express-response.js';

async function write(response: Response) {
  const res = new FakeExpressResponse();
  await writeAuthResponse(res.asResponse(), response);
  return res;
}

describe('writeAuthResponse', () => {
  it('copia el estado, el cuerpo y las cabeceras de better-auth', async () => {
    const res = await write(
      new Response('{"ok":true}', {
        status: 201,
        headers: { 'content-type': 'application/json', 'x-otra': 'sí' },
      }),
    );

    expect(res.statusCode).toBe(201);
    expect(res.body).toBe('{"ok":true}');
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(res.headers.get('x-otra')).toBe('sí');
  });

  it('agrega cada cookie con su propia cabecera Set-Cookie', async () => {
    const headers = new Headers();
    headers.append('set-cookie', 'fiaro.session_token=a; Path=/; HttpOnly');
    headers.append('set-cookie', 'fiaro.otra=b; Path=/');

    const res = await write(new Response('{}', { headers }));

    expect(res.cookies).toEqual([
      'fiaro.session_token=a; Path=/; HttpOnly',
      'fiaro.otra=b; Path=/',
    ]);
  });

  it('suma el Vary de better-auth al de la API en lugar de reemplazarlo', async () => {
    const res = await write(
      new Response('{}', { headers: { vary: 'Origin' } }),
    );

    expect(res.varyValue).toBe('Origin');
    expect(res.headers.has('vary')).toBe(false);
  });

  it('no copia las cabeceras que Express calcula por su cuenta', async () => {
    const res = await write(
      new Response('{"a":1}', {
        headers: { 'content-length': '999', connection: 'keep-alive' },
      }),
    );

    expect(res.headers.has('content-length')).toBe(false);
    expect(res.headers.has('connection')).toBe(false);
  });

  it('nunca se guarda en caché: lleva el token de sesión', async () => {
    const res = await write(new Response('{}'));

    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('un error de better-auth pasa con su estado y su cuerpo', async () => {
    const res = await write(
      new Response('{"code":"INVALID_PHONE_NUMBER_OR_PASSWORD"}', {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(res.statusCode).toBe(401);
    expect(res.body).toBe('{"code":"INVALID_PHONE_NUMBER_OR_PASSWORD"}');
  });

  describe('cuando better-auth limita la tasa (429)', () => {
    it('responde con el contrato de errores y el Retry-After estándar', async () => {
      const res = await write(
        new Response('{"message":"Too many requests."}', {
          status: 429,
          headers: { 'x-retry-after': '42' },
        }),
      );

      expect(res.statusCode).toBe(429);
      expect(res.headers.get('retry-after')).toBe('42');
      expect(res.headers.get('content-type')).toBe('application/json');
      expect(JSON.parse(res.body ?? '')).toEqual({
        code: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
      });
    });

    it('si better-auth no dice cuánto esperar, Retry-After es de un minuto', async () => {
      const res = await write(new Response('{}', { status: 429 }));

      expect(res.headers.get('retry-after')).toBe('60');
    });
  });
});
