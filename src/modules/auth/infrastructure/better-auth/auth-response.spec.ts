import { describe, expect, it } from 'vitest';
import { writeAuthResponse } from '@/modules/auth/infrastructure/better-auth/auth-response.js';
import { realApiErrors } from '@test/support/api-errors.js';
import { FakeExpressResponse } from '@test/support/fake-express-response.js';

async function write(response: Response, requestUrl = '/probe') {
  const res = new FakeExpressResponse();
  res.req = { originalUrl: requestUrl };
  await writeAuthResponse(res.asResponse(), response, realApiErrors());
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

  it('nunca se guarda en caché: lleva la cookie de sesión y datos personales', async () => {
    const res = await write(new Response('{}'));

    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  describe('el token de sesión solo viaja en la cookie', () => {
    const json = { 'content-type': 'application/json' };

    it('se quita del cuerpo de iniciar sesión y la cookie sigue llegando', async () => {
      const headers = new Headers(json);
      headers.append('set-cookie', 'fiaro.session_token=abc; Path=/; HttpOnly');

      const res = await write(
        new Response('{"token":"abc","user":{"id":"u1"}}', { headers }),
      );

      expect(JSON.parse(res.body ?? '')).toEqual({ user: { id: 'u1' } });
      expect(res.cookies).toEqual([
        'fiaro.session_token=abc; Path=/; HttpOnly',
      ]);
    });

    it('se quita de la sesión que devuelve ver la sesión', async () => {
      const res = await write(
        new Response(
          '{"session":{"id":"s1","token":"abc"},"user":{"id":"u1"}}',
          { headers: json },
        ),
      );

      expect(JSON.parse(res.body ?? '')).toEqual({
        session: { id: 's1' },
        user: { id: 'u1' },
      });
    });

    it('un cuerpo que no es JSON pasa tal cual', async () => {
      const res = await write(
        new Response('token=abc', {
          headers: { 'content-type': 'text/plain' },
        }),
      );

      expect(res.body).toBe('token=abc');
    });

    it('un cuerpo que dice ser JSON y no lo es pasa tal cual', async () => {
      const res = await write(new Response('no es json', { headers: json }));

      expect(res.body).toBe('no es json');
    });

    it('un cuerpo vacío pasa tal cual', async () => {
      const res = await write(new Response('', { headers: json }));

      expect(res.body).toBe('');
    });
  });

  describe('un error de better-auth sale con la forma de error de la API y en el idioma de la petición', () => {
    const json = { 'content-type': 'application/json' };

    const error = (
      status: number,
      body: string,
      headers: Record<string, string> = json,
    ) => new Response(body, { status, headers });

    it('conserva el estado y el código, y escribe el mensaje del catálogo en lugar del inglés de better-auth', async () => {
      const res = await write(
        error(
          401,
          '{"code":"INVALID_PHONE_NUMBER_OR_PASSWORD","message":"Invalid phone number or password"}',
        ),
        '/auth/sign-in/phone-number?debug=1',
      );

      expect(res.statusCode).toBe(401);
      expect(res.headers.get('content-type')).toBe('application/json');
      expect(JSON.parse(res.body ?? '')).toMatchObject({
        statusCode: 401,
        code: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
        message: 'El celular o la contraseña no son correctos.',
        path: '/auth/sign-in/phone-number',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/),
        issues: null,
      });
    });

    it('dice en qué idioma salió el texto y que cambia según Accept-Language', async () => {
      const res = await write(error(400, '{"code":"INVALID_PASSWORD"}'));

      expect(res.headers.get('content-language')).toBe('es');
      expect(res.varyValue).toBe('Accept-Language');
    });

    it('suma el Vary de better-auth y el de Accept-Language', async () => {
      const res = await write(
        error(403, '{"code":"INVALID_ORIGIN"}', { ...json, vary: 'Origin' }),
      );

      expect(res.varyValues).toEqual(['Origin', 'Accept-Language']);
    });

    it('un código que el catálogo no conoce usa el texto de su estado', async () => {
      const res = await write(error(403, '{"code":"CODIGO_NUEVO"}'));

      expect(JSON.parse(res.body ?? '')).toMatchObject({
        code: 'CODIGO_NUEVO',
        message: 'No tienes permiso para hacer esto.',
      });
    });

    it.each([
      ['un cuerpo vacío', ''],
      ['un cuerpo que no es JSON', 'Internal Server Error'],
      ['un cuerpo sin código', '{"message":"algo falló"}'],
      ['un código que no es texto', '{"code":42}'],
    ])('con %s deduce el código del estado', async (_case, body) => {
      const res = await write(error(500, body));

      expect(JSON.parse(res.body ?? '')).toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message:
          'Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.',
      });
    });

    it('no repite ningún texto de better-auth', async () => {
      const res = await write(
        error(400, '{"code":"INVALID_PASSWORD","message":"Invalid password"}'),
      );

      expect(res.body).not.toContain('Invalid password');
    });
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
      expect(JSON.parse(res.body ?? '')).toMatchObject({
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Demasiadas solicitudes. Intenta de nuevo en unos segundos.',
      });
    });

    it('es RATE_LIMITED aunque better-auth mande otro código', async () => {
      const res = await write(
        new Response('{"code":"TOO_MANY_REQUESTS"}', {
          status: 429,
          headers: { 'content-type': 'application/json' },
        }),
      );

      expect(JSON.parse(res.body ?? '')).toMatchObject({
        code: 'RATE_LIMITED',
      });
    });

    it('el bloqueo de un celular conserva su código SIGN_IN_LOCKED y su Retry-After', async () => {
      const res = await write(
        new Response(
          '{"code":"SIGN_IN_LOCKED","message":"Demasiados intentos fallidos con este celular."}',
          {
            status: 429,
            headers: {
              'content-type': 'application/json',
              'x-retry-after': '612',
            },
          },
        ),
      );

      expect(res.headers.get('retry-after')).toBe('612');
      expect(JSON.parse(res.body ?? '')).toMatchObject({
        statusCode: 429,
        code: 'SIGN_IN_LOCKED',
        message:
          'Demasiados intentos fallidos con este celular. Intenta de nuevo más tarde.',
      });
    });

    it('si better-auth no dice cuánto esperar, Retry-After es de un minuto', async () => {
      const res = await write(new Response('{}', { status: 429 }));

      expect(res.headers.get('retry-after')).toBe('60');
    });
  });
});
