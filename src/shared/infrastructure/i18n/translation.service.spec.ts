import { describe, expect, it } from 'vitest';
import { runWithLanguage } from '@/shared/infrastructure/i18n/language-context.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';

/**
 * Dos idiomas: el inglés solo tiene una de las claves, para ver el respaldo en el idioma de por
 * defecto.
 */
const service = new TranslationService({
  es: {
    'errors.NOT_FOUND': 'No encontramos lo que buscas.',
    'errors.FORBIDDEN': 'Sin permiso.',
    'validation.too_small.string': 'Mínimo {minimum}.',
  },
  en: {
    'errors.NOT_FOUND': 'We could not find it.',
    'validation.too_small.string': 'Minimum {minimum}.',
  },
});

const inLanguage = <T>(language: string, fn: () => T) =>
  runWithLanguage(language, fn);

describe('TranslationService', () => {
  describe('translate', () => {
    it('fuera de una petición usa el idioma de por defecto', () => {
      expect(service.translate('errors.NOT_FOUND')).toBe(
        'No encontramos lo que buscas.',
      );
    });

    it('usa el idioma de la petición', () => {
      expect(
        inLanguage('en', () => service.translate('errors.NOT_FOUND')),
      ).toBe('We could not find it.');
    });

    it('llena los marcadores con los valores', () => {
      expect(
        inLanguage('en', () =>
          service.translate('validation.too_small.string', { minimum: 3 }),
        ),
      ).toBe('Minimum 3.');
    });

    it('si el idioma no tiene la clave, la responde en el idioma de por defecto', () => {
      expect(
        inLanguage('en', () => service.translate('errors.FORBIDDEN')),
      ).toBe('Sin permiso.');
    });

    it('si un idioma no tiene catálogo, usa el de por defecto', () => {
      expect(
        inLanguage('fr', () => service.translate('errors.NOT_FOUND')),
      ).toBe('No encontramos lo que buscas.');
    });

    it('si ningún idioma tiene la clave, devuelve la clave', () => {
      expect(service.translate('errors.INTERNAL_ERROR')).toBe(
        'errors.INTERNAL_ERROR',
      );
    });
  });

  describe('find', () => {
    it('devuelve el texto de una clave que se conoce al ejecutar', () => {
      expect(service.find('errors.FORBIDDEN')).toBe('Sin permiso.');
    });

    it('devuelve undefined si ningún idioma tiene la clave', () => {
      expect(service.find('errors.NO_EXISTE')).toBeUndefined();
    });

    it('un texto cualquiera no es una clave, ni siquiera los nombres de Object.prototype', () => {
      for (const text of [
        'constructor',
        'toString',
        '__proto__',
        'hasOwnProperty',
        'Ingresa un celular válido.',
      ]) {
        expect(service.find(text)).toBeUndefined();
      }
    });
  });

  describe('language', () => {
    it('es el de la petición cuando tiene catálogo', () => {
      expect(inLanguage('en', () => service.language)).toBe('en');
    });

    it('es el de por defecto cuando no tiene catálogo o no hay petición', () => {
      expect(inLanguage('fr', () => service.language)).toBe('es');
      expect(service.language).toBe('es');
    });
  });
});
