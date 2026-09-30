import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { currentLenderScopeFromContext } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { setLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

const contextFor = (request: Request) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('currentLenderScopeFromContext', () => {
  it('devuelve el alcance de la petición', () => {
    const request = {} as Request;
    const scope = {
      membershipId: 'membership-1',
      lenderId: 'lender-1',
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
    };
    setLenderScope(request, scope);

    expect(currentLenderScopeFromContext(undefined, contextFor(request))).toBe(
      scope,
    );
  });

  it('en una ruta sin LenderScopeGuard es un error de programación, no un alcance vacío', () => {
    expect(() =>
      currentLenderScopeFromContext(undefined, contextFor({} as Request)),
    ).toThrow(
      /@CurrentLenderScope\(\) se usó en una ruta sin LenderScopeGuard/,
    );
  });
});
