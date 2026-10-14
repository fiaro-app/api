import { describe, expect, it } from 'vitest';
import {
  validateBrandColor,
  validateLenderData,
} from '@/modules/lenders/application/services/lender-data.validator.js';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';

const VALID = {
  name: 'Préstamos Ana',
  logoUrl: null,
  nonWorkingWeekdays: ['SUNDAY'] as const,
  skipNationalHolidays: false,
};

describe('validateLenderData', () => {
  it('devuelve los datos, con el nombre recortado', () => {
    expect(validateLenderData({ ...VALID, name: '  Préstamos Ana  ' })).toEqual(
      VALID,
    );
  });

  it('acepta un logo', () => {
    expect(
      validateLenderData({ ...VALID, logoUrl: 'https://example.com/logo.png' }),
    ).toMatchObject({ logoUrl: 'https://example.com/logo.png' });
  });

  it('rechaza un nombre demasiado corto', () => {
    let error: unknown;
    try {
      validateLenderData({ ...VALID, name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidLenderDataError);
    expect((error as InvalidLenderDataError).issues[0]?.path).toEqual(['name']);
  });

  it('rechaza un logo que no es una URL', () => {
    let error: unknown;
    try {
      validateLenderData({ ...VALID, logoUrl: 'no-es-una-url' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidLenderDataError);
    expect((error as InvalidLenderDataError).issues[0]?.path).toEqual([
      'logoUrl',
    ]);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validateLenderData({ ...VALID, name: 'A' });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidLenderDataError).issues[0]?.params).toEqual({
      minimum: '2',
    });
  });
});

describe('validateBrandColor', () => {
  it('deja null como está: el color de Fiaro', () => {
    expect(validateBrandColor(null)).toBeNull();
  });

  it('devuelve el color en mayúsculas', () => {
    expect(validateBrandColor('#ff8800')).toBe('#FF8800');
  });

  it('rechaza lo que no es #RRGGBB, con un issue en brandColor', () => {
    let error: unknown;
    try {
      validateBrandColor('#F80');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(InvalidLenderDataError);
    expect((error as InvalidLenderDataError).issues[0]?.path).toEqual([
      'brandColor',
    ]);
  });
});
