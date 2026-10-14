import { describe, expect, it } from 'vitest';
import { validatePortfolioData } from '@/modules/lenders/application/services/portfolio-data.validator.js';
import { InvalidPortfolioDataError } from '@/modules/lenders/domain/errors/invalid-portfolio-data.error.js';

describe('validatePortfolioData', () => {
  it('devuelve el nombre, recortado', () => {
    expect(validatePortfolioData({ name: '  Zona Norte  ' })).toEqual({
      name: 'Zona Norte',
    });
  });

  it('rechaza un nombre demasiado corto', () => {
    let error: unknown;
    try {
      validatePortfolioData({ name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidPortfolioDataError);
    expect((error as InvalidPortfolioDataError).issues[0]?.path).toEqual([
      'name',
    ]);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validatePortfolioData({ name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidPortfolioDataError).issues[0]?.params).toEqual({
      minimum: '2',
    });
  });
});
