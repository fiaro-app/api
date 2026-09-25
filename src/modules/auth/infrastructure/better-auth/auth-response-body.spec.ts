import { describe, expect, it } from 'vitest';
import { withoutSessionToken } from '@/modules/auth/infrastructure/better-auth/auth-response-body.js';

describe('withoutSessionToken', () => {
  const user = { id: 'u1', name: 'Ana' };

  it('quita el token del cuerpo de iniciar sesión y de cambiar la contraseña', () => {
    expect(withoutSessionToken({ token: 'abc', user })).toEqual({ user });
  });

  it('quita el token de la sesión en el cuerpo de ver la sesión', () => {
    const body = { session: { id: 's1', token: 'abc', userId: 'u1' }, user };

    expect(withoutSessionToken(body)).toEqual({
      session: { id: 's1', userId: 'u1' },
      user,
    });
  });

  it('no toca lo demás: un cuerpo sin token queda igual', () => {
    expect(withoutSessionToken({ success: true })).toEqual({ success: true });
    expect(withoutSessionToken({ code: 'X', message: 'y' })).toEqual({
      code: 'X',
      message: 'y',
    });
  });

  it('no modifica el cuerpo original', () => {
    const body = { token: 'abc', session: { token: 'abc' } };

    withoutSessionToken(body);

    expect(body).toEqual({ token: 'abc', session: { token: 'abc' } });
  });

  it.each([
    ['null, como ver la sesión sin sesión vigente', null],
    ['un texto', 'hola'],
    ['un número', 3],
    ['una lista', [{ token: 'abc' }]],
  ])('devuelve %s tal cual', (_caso, body) => {
    expect(withoutSessionToken(body)).toBe(body);
  });
});
