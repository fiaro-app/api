import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { PlatformAdminGuard } from '@/shared/infrastructure/http/platform-admin.guard.js';
import { setAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';

const guard = (phones: string[]) =>
  new PlatformAdminGuard({ platformAdminPhones: phones } as Env);

function contextFor(phone: string | null): ExecutionContext {
  const request = {};
  if (phone !== null) {
    setAuthenticatedSession(request as never, {
      id: 's1',
      user: { id: 'u1', phone, fullName: 'X', mustChangePassword: false },
    });
  }
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PlatformAdminGuard', () => {
  it('deja pasar a quien está en la lista', () => {
    expect(
      guard(['+573001112233']).canActivate(contextFor('+573001112233')),
    ).toBe(true);
  });

  it('niega a cualquier otra persona, y a todos si la lista está vacía', () => {
    expect(() =>
      guard(['+573001112233']).canActivate(contextFor('+573009998877')),
    ).toThrow(ForbiddenException);
    expect(() => guard([]).canActivate(contextFor('+573001112233'))).toThrow(
      ForbiddenException,
    );
  });

  it('avisa del error de programación si se usó sin AuthGuard', () => {
    expect(() => guard([]).canActivate(contextFor(null))).toThrow(
      /sin AuthGuard/,
    );
  });
});
