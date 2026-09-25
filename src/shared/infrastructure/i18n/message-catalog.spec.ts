import { describe, expect, it } from 'vitest';
import {
  FLAT_CATALOGS,
  flatten,
  interpolate,
} from '@/shared/infrastructure/i18n/message-catalog.js';

describe('flatten', () => {
  it('deja las claves como rutas con puntos', () => {
    expect(
      flatten({
        errors: { NOT_FOUND: 'a' },
        validation: { too_small: { string: 'b' } },
      }),
    ).toEqual({
      'errors.NOT_FOUND': 'a',
      'validation.too_small.string': 'b',
    });
  });

  it('un árbol vacío queda vacío', () => {
    expect(flatten({})).toEqual({});
  });
});

describe('interpolate', () => {
  it('reemplaza cada marcador por su valor', () => {
    expect(
      interpolate('Entre {minimum} y {maximum}.', {
        minimum: 3,
        maximum: '10',
      }),
    ).toBe('Entre 3 y 10.');
  });

  it('reemplaza un marcador que se repite', () => {
    expect(interpolate('{n} y {n}', { n: 1 })).toBe('1 y 1');
  });

  it('un marcador sin valor queda a la vista en lugar de escribir undefined', () => {
    expect(interpolate('Mínimo {minimum}.', {})).toBe('Mínimo {minimum}.');
    expect(interpolate('Mínimo {minimum}.')).toBe('Mínimo {minimum}.');
  });

  it('respeta el valor 0', () => {
    expect(interpolate('{n}', { n: 0 })).toBe('0');
  });

  it('un valor no se vuelve a interpretar como marcador', () => {
    expect(interpolate('{a}', { a: '{b}', b: 'x' })).toBe('{b}');
  });

  it('un texto sin marcadores no cambia', () => {
    expect(interpolate('Hola.', { a: 1 })).toBe('Hola.');
  });
});

describe('FLAT_CATALOGS', () => {
  it('trae el catálogo de cada idioma con las claves aplanadas', () => {
    expect(FLAT_CATALOGS.es?.['errors.NOT_FOUND']).toBe(
      'No encontramos lo que buscas.',
    );
    expect(FLAT_CATALOGS.es?.['validation.too_small.string']).toContain(
      '{minimum}',
    );
  });
});
