import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
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

function setup(resolved: LenderScope | null) {
  const resolve = vi.fn<LenderScopeResolver['resolve']>(() =>
    Promise.resolve(resolved),
  );
  const guard = new LenderScopeGuard({ resolve });
  const request = {} as Request;
  const contextFor = () =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;
  return { guard, resolve, request, contextFor };
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
});
