import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import type { AuthenticatedSession } from '@/shared/application/ports/session-resolver.port.js';
import {
  getAuthenticatedSession,
  setAuthenticatedSession,
} from '@/shared/infrastructure/http/authenticated-request.js';

const SESSION: AuthenticatedSession = {
  id: 'session-1',
  user: {
    id: 'user-1',
    phone: '+573001234567',
    fullName: 'Ana Pérez',
    mustChangePassword: false,
  },
};

describe('sesión de la petición', () => {
  it('no hay sesión hasta que el guard la guarda', () => {
    expect(getAuthenticatedSession({} as Request)).toBeUndefined();
  });

  it('devuelve la sesión que se guardó', () => {
    const request = {} as Request;

    setAuthenticatedSession(request, SESSION);

    expect(getAuthenticatedSession(request)).toBe(SESSION);
  });

  it('la guarda bajo una clave simbólica: no aparece al listar ni serializar la petición', () => {
    const request = {} as Request;

    setAuthenticatedSession(request, SESSION);

    expect(Object.keys(request)).toEqual([]);
    expect(JSON.stringify(request)).toBe('{}');
  });
});
