import { describe, expect, it, vi } from 'vitest';
import {
  hashWhenPhoneIsUnknown,
  withPasswordChangeCleared,
} from '@/modules/auth/infrastructure/better-auth/auth-hook-rules.js';

function timing(phoneExists: boolean) {
  return {
    phoneExists: vi.fn(() => Promise.resolve(phoneExists)),
    hash: vi.fn((password: string) => Promise.resolve(`hash(${password})`)),
  };
}

describe('hashWhenPhoneIsUnknown', () => {
  const body = { phoneNumber: '+573001234567', password: 'una-contraseña' };

  it('con un celular sin cuenta calcula el hash, para tardar lo mismo que con uno que sí la tiene', async () => {
    const deps = timing(false);

    await hashWhenPhoneIsUnknown(deps, body);

    expect(deps.phoneExists).toHaveBeenCalledWith('+573001234567');
    expect(deps.hash).toHaveBeenCalledWith('una-contraseña');
  });

  it('con un celular que tiene cuenta no hace nada más: better-auth ya calculará el hash', async () => {
    const deps = timing(true);

    await hashWhenPhoneIsUnknown(deps, body);

    expect(deps.hash).not.toHaveBeenCalled();
  });

  it.each([
    ['sin body', undefined],
    ['un body nulo', null],
    ['un texto', 'hola'],
    ['un body sin contraseña', { phoneNumber: '+573001234567' }],
    ['un body sin celular', { password: 'una-contraseña' }],
    ['un celular que no es texto', { phoneNumber: 3001234567, password: 'x' }],
    [
      'una contraseña que no es texto',
      { phoneNumber: '+573001234567', password: 1 },
    ],
  ])(
    'no consulta ni calcula nada con %s: better-auth lo rechazará',
    async (_caso, malformed) => {
      const deps = timing(false);

      await hashWhenPhoneIsUnknown(deps, malformed);

      expect(deps.phoneExists).not.toHaveBeenCalled();
      expect(deps.hash).not.toHaveBeenCalled();
    },
  );
});

describe('withPasswordChangeCleared', () => {
  it('deja mustChangePassword en falso y conserva el resto de la respuesta', () => {
    const response = {
      token: 'abc',
      user: { id: 'user-1', name: 'Ana', mustChangePassword: true },
    };

    expect(withPasswordChangeCleared(response)).toEqual({
      token: 'abc',
      user: { id: 'user-1', name: 'Ana', mustChangePassword: false },
    });
  });

  it('no modifica el objeto original', () => {
    const response = { user: { mustChangePassword: true } };

    withPasswordChangeCleared(response);

    expect(response.user.mustChangePassword).toBe(true);
  });

  it('devuelve tal cual una respuesta sin usuario', () => {
    const response = { token: 'abc' };

    expect(withPasswordChangeCleared(response)).toBe(response);
  });
});
