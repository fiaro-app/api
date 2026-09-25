import { RequestMethod, VERSION_NEUTRAL } from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants.js';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { AuthController } from '@/modules/auth/infrastructure/controllers/auth.controller.js';
import { IS_PUBLIC_KEY } from '@/shared/infrastructure/http/public.decorator.js';
import { realApiErrors } from '@test/support/api-errors.js';
import { FakeExpressResponse } from '@test/support/fake-express-response.js';

const env = { auth: { baseUrl: 'https://api.fiaro.co' } } as Env;

const requestOf = (method: string) =>
  ({ method, headers: {}, ip: '203.0.113.7' }) as unknown as Request;

function setup(reply: () => Response = () => new Response('{}')) {
  const handler = vi.fn<(request: globalThis.Request) => Promise<Response>>(
    () => Promise.resolve(reply()),
  );
  return {
    controller: new AuthController(
      { handler } as unknown as Auth,
      env,
      realApiErrors(),
    ),
    handler,
    res: new FakeExpressResponse(),
  };
}

/** La petición que recibió better-auth. */
const forwarded = (handler: { mock: { calls: unknown[][] } }) =>
  handler.mock.calls[0]?.[0] as globalThis.Request;

const SIGN_IN = { phoneNumber: '+573001234567', password: 'clave-larga-1' };
const CHANGE = {
  currentPassword: 'clave-larga-1',
  newPassword: 'clave-nueva-2',
};

describe('AuthController', () => {
  describe('las rutas que publica', () => {
    const publishedRoutes = () =>
      Object.getOwnPropertyNames(AuthController.prototype)
        .flatMap((name) => {
          const handler = Reflect.get(AuthController.prototype, name) as object;
          const method = Reflect.getMetadata(METHOD_METADATA, handler) as
            RequestMethod | undefined;
          return method === undefined
            ? []
            : [
                `${RequestMethod[method]} ${String(Reflect.getMetadata(PATH_METADATA, handler))}`,
              ];
        })
        .sort();

    it('son solo iniciar sesión, ver la sesión, cerrarla y cambiar la contraseña', () => {
      expect(publishedRoutes()).toEqual([
        'GET get-session',
        'POST change-password',
        'POST sign-in/phone-number',
        'POST sign-out',
      ]);
    });

    it('cuelgan de /auth, responden con cualquier versión de la API y no exigen sesión', () => {
      expect(Reflect.getMetadata(PATH_METADATA, AuthController)).toBe('auth');
      expect(Reflect.getMetadata(VERSION_METADATA, AuthController)).toBe(
        VERSION_NEUTRAL,
      );
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController)).toBe(true);
    });
  });

  describe('qué le pide cada ruta a better-auth', () => {
    it('iniciar sesión: POST con el cuerpo validado', async () => {
      const { controller, handler, res } = setup();

      await controller.signIn(SIGN_IN, requestOf('POST'), res.asResponse());

      const request = forwarded(handler);
      expect(request.method).toBe('POST');
      expect(request.url).toBe(
        'https://api.fiaro.co/auth/sign-in/phone-number',
      );
      await expect(request.json()).resolves.toEqual(SIGN_IN);
    });

    it('ver la sesión: GET sin cuerpo', async () => {
      const { controller, handler, res } = setup();

      await controller.getSession(requestOf('GET'), res.asResponse());

      const request = forwarded(handler);
      expect(request.method).toBe('GET');
      expect(request.url).toBe('https://api.fiaro.co/auth/get-session');
      expect(request.body).toBeNull();
    });

    it('cerrar sesión: POST sin cuerpo', async () => {
      const { controller, handler, res } = setup();

      await controller.signOut(requestOf('POST'), res.asResponse());

      const request = forwarded(handler);
      expect(request.url).toBe('https://api.fiaro.co/auth/sign-out');
      expect(request.body).toBeNull();
    });

    it('cambiar la contraseña: POST con el cuerpo validado', async () => {
      const { controller, handler, res } = setup();

      await controller.changePassword(
        CHANGE,
        requestOf('POST'),
        res.asResponse(),
      );

      const request = forwarded(handler);
      expect(request.url).toBe('https://api.fiaro.co/auth/change-password');
      await expect(request.json()).resolves.toEqual(CHANGE);
    });
  });

  it('escribe en la respuesta lo que contesta better-auth', async () => {
    const { controller, res } = setup(
      () => new Response('{"success":true}', { status: 200 }),
    );

    await controller.signOut(requestOf('POST'), res.asResponse());

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('{"success":true}');
  });

  it('escribe los errores de better-auth con la forma y el idioma de la API', async () => {
    const { controller, res } = setup(
      () =>
        new Response(
          '{"code":"INVALID_PASSWORD","message":"Invalid password"}',
          {
            status: 400,
          },
        ),
    );

    await controller.changePassword(
      CHANGE,
      requestOf('POST'),
      res.asResponse(),
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body ?? '')).toMatchObject({
      statusCode: 400,
      code: 'INVALID_PASSWORD',
      message: 'La contraseña no es correcta.',
    });
  });
});
