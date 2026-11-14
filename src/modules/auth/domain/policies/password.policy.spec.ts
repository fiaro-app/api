import { describe, expect, it } from 'vitest';
import { InvalidPasswordError } from '@/modules/auth/domain/errors/invalid-password.error.js';
import {
  assertPasswordAllowed,
  isPasswordLengthAllowed,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/modules/auth/domain/policies/password.policy.js';

describe('assertPasswordAllowed', () => {
  it('acepta las longitudes de los dos extremos', () => {
    expect(() => {
      assertPasswordAllowed('a'.repeat(PASSWORD_MIN_LENGTH));
      assertPasswordAllowed('a'.repeat(PASSWORD_MAX_LENGTH));
    }).not.toThrow();
  });

  it.each([
    ['una contraseña vacía', ''],
    [
      'una contraseña un carácter más corta que el mínimo',
      'a'.repeat(PASSWORD_MIN_LENGTH - 1),
    ],
    [
      'una contraseña un carácter más larga que el máximo',
      'a'.repeat(PASSWORD_MAX_LENGTH + 1),
    ],
  ])('rechaza %s', (_caso, password) => {
    expect(() => {
      assertPasswordAllowed(password);
    }).toThrow(InvalidPasswordError);
  });

  it('el mensaje dice el rango permitido y el error lleva un código estable', () => {
    let error: unknown;
    try {
      assertPasswordAllowed('corta');
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      code: 'INVALID_PASSWORD_LENGTH',
      kind: 'INVALID',
      params: { minLength: 15, maxLength: 128 },
      message: 'La contraseña debe tener entre 15 y 128 caracteres.',
    });
  });

  it('el mínimo es de 15, lo que pide NIST SP 800-63B-4 con un solo factor', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(15);
  });
});

describe('isPasswordLengthAllowed', () => {
  it.each([
    [true, PASSWORD_MIN_LENGTH],
    [true, PASSWORD_MAX_LENGTH],
    [false, PASSWORD_MIN_LENGTH - 1],
    [false, PASSWORD_MAX_LENGTH + 1],
    [false, 0],
  ])('devuelve %s con %s caracteres', (allowed, length) => {
    expect(isPasswordLengthAllowed('a'.repeat(length))).toBe(allowed);
  });
});
