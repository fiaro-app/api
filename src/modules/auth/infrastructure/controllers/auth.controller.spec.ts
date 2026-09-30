import { RequestMethod, VERSION_NEUTRAL } from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants.js';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import type { RequestPasswordResetUseCase } from '@/modules/auth/application/use-cases/request-password-reset.use-case.js';
import type { ResetPasswordUseCase } from '@/modules/auth/application/use-cases/reset-password.use-case.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { AuthController } from '@/modules/auth/infrastructure/controllers/auth.controller.js';
import type { PasswordResetGuard } from '@/modules/auth/infrastructure/password-reset/password-reset-guard.js';
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
  const auditor = {
    passwordResetRequested: vi.fn(),
    passwordResetCompleted: vi.fn(),
  };
  const passwordResetGuard = {
    admitRequest: vi.fn(() => Promise.resolve(true)),
    admitVerification: vi.fn(() => Promise.resolve()),
    forgiveVerification: vi.fn(() => Promise.resolve()),
  };
  const requestPasswordResetUseCase = {
    execute: vi.fn(() => Promise.resolve(true)),
  };
  const resetPasswordUseCase = {
    execute: vi.fn(() => Promise.resolve({ userId: 'user-1' })),
  };
  return {
    controller: new AuthController(
      { handler } as unknown as Auth,
      env,
      realApiErrors(),
      auditor as unknown as AuthAuditor,
      passwordResetGuard as unknown as PasswordResetGuard,
      requestPasswordResetUseCase as unknown as RequestPasswordResetUseCase,
      resetPasswordUseCase as unknown as ResetPasswordUseCase,
    ),
    handler,
    auditor,
    passwordResetGuard,
    requestPasswordResetUseCase,
    resetPasswordUseCase,
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

    it('son solo iniciar sesión, ver la sesión, cerrarla, cambiar la contraseña, recuperarla por correo y cerrar las demás sesiones o todas', () => {
      expect(publishedRoutes()).toEqual([
        'GET get-session',
        'POST change-password',
        'POST request-password-reset',
        'POST reset-password',
        'POST revoke-other-sessions',
        'POST revoke-sessions',
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

    it.each([
      [
        'cerrar las demás sesiones',
        'revokeOtherSessions',
        'revoke-other-sessions',
      ],
      ['cerrar todas las sesiones', 'revokeSessions', 'revoke-sessions'],
    ] as const)('%s: POST sin cuerpo', async (_caso, method, path) => {
      const { controller, handler, res } = setup();

      await controller[method](requestOf('POST'), res.asResponse());

      const request = forwarded(handler);
      expect(request.method).toBe('POST');
      expect(request.url).toBe(`https://api.fiaro.co/auth/${path}`);
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

  describe('recuperar la contraseña por correo', () => {
    it('pedir el código: admite el intento, llama al caso de uso si hay cupo y audita el resultado', async () => {
      const {
        controller,
        passwordResetGuard,
        requestPasswordResetUseCase,
        auditor,
      } = setup();

      const response = await controller.requestPasswordReset(
        { phoneNumber: '+573001234567' },
        requestOf('POST'),
      );

      expect(passwordResetGuard.admitRequest).toHaveBeenCalledExactlyOnceWith(
        '+573001234567',
      );
      expect(
        requestPasswordResetUseCase.execute,
      ).toHaveBeenCalledExactlyOnceWith({ phoneNumber: '+573001234567' });
      expect(auditor.passwordResetRequested).toHaveBeenCalledExactlyOnceWith(
        '+573001234567',
        true,
        {
          ip: '203.0.113.7',
          userAgent: undefined,
        },
      );
      expect(response).toEqual({ status: true });
    });

    it('pedir el código: sin cupo, no llama al caso de uso pero responde lo mismo', async () => {
      const {
        controller,
        passwordResetGuard,
        requestPasswordResetUseCase,
        auditor,
      } = setup();
      passwordResetGuard.admitRequest.mockResolvedValueOnce(false);

      const response = await controller.requestPasswordReset(
        { phoneNumber: '+573001234567' },
        requestOf('POST'),
      );

      expect(requestPasswordResetUseCase.execute).not.toHaveBeenCalled();
      expect(auditor.passwordResetRequested).toHaveBeenCalledExactlyOnceWith(
        '+573001234567',
        false,
        expect.anything(),
      );
      expect(response).toEqual({ status: true });
    });

    it('restablecer: admite el canje, ejecuta el caso de uso, perdona los intentos y audita', async () => {
      const { controller, passwordResetGuard, resetPasswordUseCase, auditor } =
        setup();
      const body = {
        phoneNumber: '+573001234567',
        code: '048213',
        newPassword: 'la-contraseña-nueva-2',
      };

      const response = await controller.resetPassword(body, requestOf('POST'));

      expect(
        passwordResetGuard.admitVerification,
      ).toHaveBeenCalledExactlyOnceWith(body.phoneNumber);
      expect(resetPasswordUseCase.execute).toHaveBeenCalledExactlyOnceWith(
        body,
      );
      expect(
        passwordResetGuard.forgiveVerification,
      ).toHaveBeenCalledExactlyOnceWith(body.phoneNumber);
      expect(auditor.passwordResetCompleted).toHaveBeenCalledExactlyOnceWith(
        { id: 'user-1', phone: body.phoneNumber },
        { ip: '203.0.113.7', userAgent: undefined },
      );
      expect(response).toEqual({ status: true });
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
