import {
  type ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type {
  AuthenticatedSession,
  SessionResolver,
} from '@/shared/application/ports/session-resolver.port.js';
import { AuthGuard } from '@/shared/infrastructure/http/auth.guard.js';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { Public } from '@/shared/infrastructure/http/public.decorator.js';

class ProtectedController {
  handler() {
    return undefined;
  }

  @Public()
  openHandler() {
    return undefined;
  }
}

@Public()
class OpenController {
  handler() {
    return undefined;
  }
}

const session = (mustChangePassword = false): AuthenticatedSession => ({
  id: 'session-1',
  user: {
    id: 'user-1',
    phone: '+573001234567',
    fullName: 'Ana Pérez',
    mustChangePassword,
  },
});

function setup(resolved: AuthenticatedSession | null) {
  const resolve = vi.fn<SessionResolver['resolve']>(() =>
    Promise.resolve(resolved),
  );
  const guard = new AuthGuard(new Reflector(), { resolve });
  const request = { headers: { cookie: 'fiaro.session_token=abc' } } as Request;
  const contextOf = (
    controller: new () => object,
    method: 'handler' | 'openHandler',
  ) =>
    ({
      getHandler: () =>
        (controller.prototype as Record<string, () => unknown>)[method],
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;
  return { guard, resolve, request, contextOf };
}

describe('AuthGuard', () => {
  it('deja pasar una ruta @Public() sin consultar la sesión', async () => {
    const { guard, resolve, contextOf } = setup(null);

    await expect(
      guard.canActivate(contextOf(ProtectedController, 'openHandler')),
    ).resolves.toBe(true);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('deja pasar un controller entero marcado @Public()', async () => {
    const { guard, resolve, contextOf } = setup(null);

    await expect(
      guard.canActivate(contextOf(OpenController, 'handler')),
    ).resolves.toBe(true);
    expect(resolve).not.toHaveBeenCalled();
  });

  it('una ruta sin marcar exige sesión: sin ella responde 401 UNAUTHENTICATED', async () => {
    const { guard, contextOf } = setup(null);

    const error = await guard
      .canActivate(contextOf(ProtectedController, 'handler'))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toEqual({
      code: 'UNAUTHENTICATED',
    });
  });

  it('con sesión deja pasar y la guarda en la petición', async () => {
    const { guard, resolve, request, contextOf } = setup(session());

    await expect(
      guard.canActivate(contextOf(ProtectedController, 'handler')),
    ).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledWith(request.headers);
    expect(getAuthenticatedSession(request)).toEqual(session());
  });

  it('con contraseña temporal responde 403 PASSWORD_CHANGE_REQUIRED y no guarda la sesión', async () => {
    const { guard, request, contextOf } = setup(session(true));

    const error = await guard
      .canActivate(contextOf(ProtectedController, 'handler'))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
    expect(getAuthenticatedSession(request)).toBeUndefined();
  });
});
