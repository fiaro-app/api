import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { setAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { currentUserFromContext } from '@/shared/infrastructure/http/current-user.decorator.js';

const contextFor = (request: Request) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('currentUserFromContext', () => {
  it('devuelve la persona de la sesión de la petición', () => {
    const request = {} as Request;
    const user = {
      id: 'user-1',
      phone: '+573001234567',
      fullName: 'Ana Pérez',
      mustChangePassword: false,
    };
    setAuthenticatedSession(request, { id: 'session-1', user });

    expect(currentUserFromContext(undefined, contextFor(request))).toBe(user);
  });

  it('en una ruta sin sesión es un error de programación, no un usuario vacío', () => {
    expect(() =>
      currentUserFromContext(undefined, contextFor({} as Request)),
    ).toThrow(/@CurrentUser\(\) se usó en una ruta sin sesión/);
  });
});
