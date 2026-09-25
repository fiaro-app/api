import { describe, expect, it } from 'vitest';
import { WeakPasswordError } from '@/modules/auth/domain/errors/weak-password.error.js';
import {
  assertPasswordStrong,
  findPasswordWeakness,
} from '@/modules/auth/domain/policies/password-strength.policy.js';

const OWNER = { phone: '+573001234567', nationalId: '1032456789' };

describe('findPasswordWeakness', () => {
  describe('las contraseñas más usadas', () => {
    it.each(['password', 'qwertyuiop', 'contrasena', 'bienvenido', '12345678'])(
      'rechaza %s',
      (password) => {
        expect(findPasswordWeakness(password)).toBe('COMMON');
      },
    );

    it('no distingue mayúsculas ni tildes', () => {
      expect(findPasswordWeakness('PassWord')).toBe('COMMON');
      expect(findPasswordWeakness('CONTRASEÑA')).toBe('COMMON');
      expect(findPasswordWeakness('Corazón')).toBe('COMMON');
    });

    it.each([
      'password1',
      'password1234',
      'qwerty2026',
      'colombia123',
      'admin1234!',
    ])(
      'rechaza %s: una contraseña común con hasta cuatro dígitos y un símbolo al final',
      (password) => {
        expect(findPasswordWeakness(password)).toBe('COMMON');
      },
    );

    it('rechaza una contraseña común con un símbolo al final', () => {
      expect(findPasswordWeakness('bienvenido!')).toBe('COMMON');
      expect(findPasswordWeakness('bienvenido.')).toBe('COMMON');
    });

    it.each(['p@ssw0rd', 'P@$$w0rd', 'Adm1n', 'l3tm31n', 'p@ssw0rd2026'])(
      'rechaza %s, que es una común escrita en leet',
      (password) => {
        expect(findPasswordWeakness(password)).toBe('COMMON');
      },
    );

    it('cinco dígitos al final ya no cuentan como el final de una común', () => {
      expect(findPasswordWeakness('password12345')).toBeUndefined();
    });
  });

  describe('bloques repetidos y escaleras', () => {
    it.each([
      'aaaaaaaa',
      '5555555555',
      'abababab',
      '13131313',
      'abcabcabc',
      'holaholahola',
    ])('rechaza %s, un bloque que se repite', (password) => {
      expect(findPasswordWeakness(password)).toBe('PATTERN');
    });

    it.each(['23456789', '98765432', 'cdefghij', 'jihgfedc'])(
      'rechaza %s, una escalera de caracteres seguidos',
      (password) => {
        expect(findPasswordWeakness(password)).toBe('PATTERN');
      },
    );

    it('una sola letra no es un patrón', () => {
      expect(findPasswordWeakness('a')).toBeUndefined();
    });

    it('un texto largo con una escalera adentro pasa: solo cuenta la contraseña entera', () => {
      expect(
        findPasswordWeakness('abcdefgh-cobro-de-la-tarde'),
      ).toBeUndefined();
    });
  });

  describe('los datos de su dueño', () => {
    it('rechaza una contraseña que lleva el celular', () => {
      expect(findPasswordWeakness('ana3001234567!', OWNER)).toBe('PERSONAL');
    });

    it('lo reconoce con separadores y con el prefijo del país', () => {
      expect(findPasswordWeakness('ana-300-123-4567', OWNER)).toBe('PERSONAL');
      expect(findPasswordWeakness('57 300 123 4567 ana', OWNER)).toBe(
        'PERSONAL',
      );
    });

    it('rechaza una contraseña que lleva la cédula', () => {
      expect(findPasswordWeakness('cedula-1032456789-x', OWNER)).toBe(
        'PERSONAL',
      );
    });

    it('sin dueño no hay datos que comparar', () => {
      expect(findPasswordWeakness('ana3001234567!')).toBeUndefined();
    });

    it('un dueño sin cédula solo compara el celular', () => {
      const owner = { phone: '+573001234567', nationalId: null };
      expect(findPasswordWeakness('x1032456789x', owner)).toBeUndefined();
    });

    it('un dueño sin celular solo compara la cédula', () => {
      const owner = { nationalId: '1032456789' };
      expect(findPasswordWeakness('x3001234567x', owner)).toBeUndefined();
      expect(findPasswordWeakness('x1032456789x', owner)).toBe('PERSONAL');
    });

    it('una cédula de menos de seis dígitos no se compara: cualquier contraseña la llevaría', () => {
      expect(
        findPasswordWeakness('clave-12345-fuerte', { nationalId: '12345' }),
      ).toBeUndefined();
    });
  });

  it.each([
    'contraseña-de-prueba-1',
    'fiaro-dev-2026',
    'temporal-2026',
    'Xk7-Pq9m-Rt2w',
    'la-tienda-abre-a-las-seis',
  ])('deja pasar %s', (password) => {
    expect(findPasswordWeakness(password, OWNER)).toBeUndefined();
  });
});

describe('assertPasswordStrong', () => {
  it('no hace nada con una contraseña que pasa', () => {
    expect(() => {
      assertPasswordStrong('Xk7-Pq9m-Rt2w', OWNER);
    }).not.toThrow();
  });

  it('lanza el error de dominio con el motivo y su código', () => {
    let thrown: unknown;
    try {
      assertPasswordStrong('password123');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(WeakPasswordError);
    expect(thrown).toMatchObject({
      code: 'PASSWORD_TOO_WEAK',
      kind: 'INVALID',
      weakness: 'COMMON',
    });
    expect((thrown as Error).message).toContain('COMMON');
  });

  it('sin dueño rechaza solo lo común y los patrones', () => {
    expect(() => {
      assertPasswordStrong('ana3001234567!');
    }).not.toThrow();
    expect(() => {
      assertPasswordStrong('12345678');
    }).toThrow(WeakPasswordError);
  });
});
