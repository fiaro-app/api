import { PATH_METADATA } from '@nestjs/common/constants.js';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '@/config/env.js';
import type { ResolveSignInPhoneUseCase } from '@/modules/auth/application/use-cases/resolve-sign-in-phone.use-case.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { SignInController } from '@/modules/auth/infrastructure/controllers/sign-in.controller.js';
import { IS_PUBLIC_KEY } from '@/shared/infrastructure/http/public.decorator.js';
import { realApiErrors } from '@test/support/api-errors.js';
import { FakeExpressResponse } from '@test/support/fake-express-response.js';

function setup() {
  const handler = vi.fn<(request: globalThis.Request) => Promise<Response>>(
    () => Promise.resolve(new Response('{}')),
  );
  const resolveSignInPhone = {
    execute: vi.fn(() => Promise.resolve('+573009998877')),
  };
  const controller = new SignInController(
    { handler } as unknown as Auth,
    { auth: { baseUrl: 'https://api.fiaro.co' } } as Env,
    realApiErrors(),
    resolveSignInPhone as unknown as ResolveSignInPhoneUseCase,
  );
  return { controller, handler, resolveSignInPhone };
}

describe('SignInController', () => {
  it('es público y cuelga de /auth', () => {
    expect(Reflect.getMetadata(PATH_METADATA, SignInController)).toBe('auth');
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SignInController)).toBe(true);
  });

  it('resuelve la identidad a un celular y reenvía a la ruta de celular de better-auth', async () => {
    const { controller, handler, resolveSignInPhone } = setup();
    const res = new FakeExpressResponse();

    await controller.signIn(
      { identifier: 'ana@example.com', password: 'clave-larga-1' },
      { method: 'POST', headers: {}, ip: '203.0.113.7' } as unknown as Request,
      res.asResponse(),
    );

    expect(resolveSignInPhone.execute).toHaveBeenCalledWith('ana@example.com');
    const [request] = handler.mock.lastCall ?? [];
    if (request === undefined) {
      throw new Error('better-auth no recibió la petición');
    }
    expect(request.url).toBe('https://api.fiaro.co/auth/sign-in/phone-number');
    await expect(request.json()).resolves.toEqual({
      phoneNumber: '+573009998877',
      password: 'clave-larga-1',
    });
  });
});
