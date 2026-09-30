import { describe, expect, it } from 'vitest';
import { validateLenderData } from '@/modules/lenders/application/services/lender-data.validator.js';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';

describe('validateLenderData', () => {
  it('devuelve el nombre recortado', () => {
    expect(validateLenderData({ name: '  Préstamos Ana  ' })).toEqual({
      name: 'Préstamos Ana',
    });
  });

  it('rechaza un nombre demasiado corto', () => {
    let error: unknown;
    try {
      validateLenderData({ name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidLenderDataError);
    expect((error as InvalidLenderDataError).issues[0]?.path).toEqual(['name']);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validateLenderData({ name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidLenderDataError).issues[0]?.params).toEqual({
      minimum: '2',
    });
  });
});
