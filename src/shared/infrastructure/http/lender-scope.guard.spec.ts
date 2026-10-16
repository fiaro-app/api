import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type {
  LenderScope,
  LenderScopeResolver,
} from '@/shared/application/ports/lender-scope-resolver.port.js';
import { setAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { getLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';

const SCOPE: LenderScope = {
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles: ['OWNER', 'LENDER', 'COLLECTOR'],
};

function setup(
  resolved: LenderScope | null,
  options: { readOnly?: boolean; allowed?: boolean; method?: string } = {},
) {
  const resolve = vi.fn<LenderScopeResolver['resolve']>(() =>
    Promise.resolve(resolved),
  );
  const isReadOnly = vi.fn(() => Promise.resolve(options.readOnly ?? false));
  const reflector = {
    get: vi.fn(() => options.allowed),
  } as unknown as Reflector;
  const guard = new LenderScopeGuard({ resolve }, { isReadOnly }, reflector);
  const request = { method: options.method ?? 'GET' } as Request;
  const contextFor = () =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
    }) as unknown as ExecutionContext;
  return { guard, resolve, request, contextFor, isReadOnly };
}

describe('LenderScopeGuard', () => {
  it('sin AuthGuard antes es un error de programación, no un 403', async () => {
    const { guard, contextFor } = setup(SCOPE);

    await expect(guard.canActivate(contextFor())).rejects.toThrow(
      /LenderScopeGuard se usó en una ruta sin AuthGuard/,
    );
  });

  it('con una membresía activa deja pasar y guarda el alcance en la petición', async () => {
    const { guard, resolve, request, contextFor } = setup(SCOPE);
    setAuthenticatedSession(request, {
      id: 'session-1',
      user: {
        id: 'user-1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        mustChangePassword: false,
      },
    });

    await expect(guard.canActivate(contextFor())).resolves.toBe(true);

    expect(resolve).toHaveBeenCalledExactlyOnceWith('user-1');
    expect(getLenderScope(request)).toBe(SCOPE);
  });

  it('sin ninguna membresía activa responde 403 FORBIDDEN', async () => {
    const { guard, request, contextFor } = setup(null);
    setAuthenticatedSession(request, {
      id: 'session-1',
      user: {
        id: 'user-1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        mustChangePassword: false,
      },
    });

    const error = await guard
      .canActivate(contextFor())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect((error as ForbiddenException).getResponse()).toEqual({
      code: 'FORBIDDEN',
    });
    expect(getLenderScope(request)).toBeUndefined();
  });

  describe('solo lectura', () => {
    const SESSION = {
      id: 'session-1',
      user: {
        id: 'user-1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        mustChangePassword: false,
      },
    };

    it('bloquea una escritura con 403 SUBSCRIPTION_READ_ONLY', async () => {
      const { guard, request, contextFor, isReadOnly } = setup(SCOPE, {
        readOnly: true,
        method: 'POST',
      });
      setAuthenticatedSession(request, SESSION);

      const error: unknown = await guard
        .canActivate(contextFor())
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual({
        code: 'SUBSCRIPTION_READ_ONLY',
      });
      expect(isReadOnly).toHaveBeenCalledExactlyOnceWith('lender-1');
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
      'revisa el plan en un %s',
      async (method) => {
        const { guard, request, contextFor, isReadOnly } = setup(SCOPE, {
          method,
        });
        setAuthenticatedSession(request, SESSION);

        await expect(guard.canActivate(contextFor())).resolves.toBe(true);

        expect(isReadOnly).toHaveBeenCalledOnce();
      },
    );

    it.each(['GET', 'QUERY'])(
      'nunca bloquea una lectura (%s) ni consulta el plan',
      async (method) => {
        const { guard, request, contextFor, isReadOnly } = setup(SCOPE, {
          readOnly: true,
          method,
        });
        setAuthenticatedSession(request, SESSION);

        await expect(guard.canActivate(contextFor())).resolves.toBe(true);

        expect(isReadOnly).not.toHaveBeenCalled();
      },
    );

    it('deja pasar una escritura marcada con AllowWhenReadOnly', async () => {
      const { guard, request, contextFor, isReadOnly } = setup(SCOPE, {
        readOnly: true,
        allowed: true,
        method: 'POST',
      });
      setAuthenticatedSession(request, SESSION);

      await expect(guard.canActivate(contextFor())).resolves.toBe(true);

      expect(isReadOnly).not.toHaveBeenCalled();
    });
  });
});
