import { describe, expect, it } from 'vitest';
import { validateUserData } from '@/modules/auth/application/services/user-data.validator.js';
import { InvalidUserDataError } from '@/modules/auth/domain/errors/invalid-user-data.error.js';

describe('validateUserData', () => {
  it('devuelve el nombre recortado y null en el email y la cédula que faltan', () => {
    expect(validateUserData({ fullName: '  Ana Pérez  ' })).toEqual({
      fullName: 'Ana Pérez',
      contactEmail: null,
      nationalId: null,
    });
  });

  it('acepta un email y una cédula válidos', () => {
    expect(
      validateUserData({
        fullName: 'Ana Pérez',
        contactEmail: 'ana@example.com',
        nationalId: '1020304050',
      }),
    ).toEqual({
      fullName: 'Ana Pérez',
      contactEmail: 'ana@example.com',
      nationalId: '1020304050',
    });
  });

  it('quita los puntos de la cédula antes de validar', () => {
    expect(
      validateUserData({ fullName: 'Ana Pérez', nationalId: '1.020.304' })
        .nationalId,
    ).toBe('1020304');
  });

  it.each([
    ['un nombre demasiado corto', { fullName: 'A' }, 'fullName'],
    [
      'una cédula con letras',
      { fullName: 'Ana', nationalId: 'abc123' },
      'nationalId',
    ],
    [
      'un email mal escrito',
      { fullName: 'Ana', contactEmail: 'ana@' },
      'email',
    ],
  ])('rechaza %s e indica el campo', (_caso, input, field) => {
    let error: unknown;
    try {
      validateUserData(input);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidUserDataError);
    expect((error as InvalidUserDataError).issues[0]?.path).toEqual([field]);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validateUserData({ fullName: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidUserDataError).issues[0]?.params).toEqual({
      minimum: '2',
    });
  });

  it('lista un issue por cada campo inválido', () => {
    let error: unknown;
    try {
      validateUserData({ fullName: 'A', nationalId: 'abc', contactEmail: 'x' });
    } catch (caught) {
      error = caught;
    }

    expect(
      (error as InvalidUserDataError).issues.map((issue) => issue.path[0]),
    ).toEqual(['fullName', 'email', 'nationalId']);
  });
});
