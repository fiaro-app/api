import { describe, expect, it } from 'vitest';
import { validateClientData } from '@/modules/clients/application/services/client-data.validator.js';
import { InvalidClientDataError } from '@/modules/clients/domain/errors/invalid-client-data.error.js';

const VALID_INPUT = {
  nationalId: '1020304050',
  fullName: 'Carlos Andrés Gómez',
  occupation: 'Vendedor ambulante',
  phone: '+573001234567',
  address: 'Calle 45 # 12-30, Bogotá',
};

describe('validateClientData', () => {
  it('devuelve los datos normalizados', () => {
    expect(validateClientData(VALID_INPUT)).toEqual(VALID_INPUT);
  });

  it('quita los separadores de la cédula antes de validar', () => {
    expect(
      validateClientData({ ...VALID_INPUT, nationalId: '1.020.304.050' })
        .nationalId,
    ).toBe('1020304050');
  });

  it('recorta los espacios sobrantes del nombre', () => {
    expect(
      validateClientData({ ...VALID_INPUT, fullName: '  Carlos Gómez  ' })
        .fullName,
    ).toBe('Carlos Gómez');
  });

  it('rechaza una cédula que no queda en solo dígitos', () => {
    let error: unknown;
    try {
      validateClientData({ ...VALID_INPUT, nationalId: 'abc123' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidClientDataError);
    expect((error as InvalidClientDataError).issues[0]?.path).toEqual([
      'nationalId',
    ]);
  });

  it('rechaza un celular que no es colombiano', () => {
    expect(
      (() => {
        try {
          validateClientData({ ...VALID_INPUT, phone: '123' });
          return null;
        } catch (caught) {
          return caught;
        }
      })(),
    ).toBeInstanceOf(InvalidClientDataError);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validateClientData({ ...VALID_INPUT, fullName: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidClientDataError).issues[0]?.params).toEqual({
      minimum: '2',
    });
  });
});
