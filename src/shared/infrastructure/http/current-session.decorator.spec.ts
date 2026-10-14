import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { setAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { currentSessionFromContext } from '@/shared/infrastructure/http/current-session.decorator.js';

const contextFor = (request: Request) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('currentSessionFromContext', () => {
  it('devuelve la sesión de la petición, con su id', () => {
    const request = {} as Request;
    const session = {
      id: 'session-1',
      user: {
        id: 'user-1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        mustChangePassword: false,
      },
    };
    setAuthenticatedSession(request, session);

    expect(currentSessionFromContext(undefined, contextFor(request))).toBe(
      session,
    );
  });

  it('en una ruta sin sesión es un error de programación', () => {
    expect(() =>
      currentSessionFromContext(undefined, contextFor({} as Request)),
    ).toThrow(/@CurrentSession\(\) se usó en una ruta sin sesión/);
  });
});
