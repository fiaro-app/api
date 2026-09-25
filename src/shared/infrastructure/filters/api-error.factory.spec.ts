import { ApiErrorSchema } from '@fiaro-app/contracts';
import { describe, expect, it } from 'vitest';
import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { runWithLanguage } from '@/shared/infrastructure/i18n/language-context.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';
import { realApiErrors } from '@test/support/api-errors.js';

/** Dos idiomas; el inglés no tiene `errors.FORBIDDEN`. */
const twoLanguages = new ApiErrorFactory(
  new TranslationService({
    es: {
      'errors.NOT_FOUND': 'No encontramos lo que buscas.',
      'errors.FORBIDDEN': 'Sin permiso.',
      'errors.UNKNOWN': 'Algo falló.',
      'errors.TOO_SHORT': 'Mínimo {minimum}.',
      'validation.too_small.string': 'La longitud mínima es {minimum}.',
    },
    en: {
      'errors.NOT_FOUND': 'We could not find it.',
      'errors.TOO_SHORT': 'At least {minimum}.',
      'validation.too_small.string': 'The minimum length is {minimum}.',
    },
  }),
);

describe('ApiErrorFactory', () => {
  const errors = realApiErrors();

  describe('create', () => {
    it('arma el error del contrato: estado, código, mensaje del catálogo, ruta y hora', () => {
      const error = errors.create(
        { statusCode: 404, code: 'NOT_FOUND' },
        '/loans/1',
      );

      expect(error).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'No encontramos lo que buscas.',
        path: '/loans/1',
        timestamp: expect.any(String),
        issues: null,
      });
      expect(ApiErrorSchema.parse(error)).toEqual(error);
    });

    it('la hora es el instante en que se arma, en ISO 8601', () => {
      const before = Date.now();

      const { timestamp } = errors.create(
        { statusCode: 500, code: 'INTERNAL_ERROR' },
        '/x',
      );

      const written = new Date(timestamp).getTime();
      expect(written).toBeGreaterThanOrEqual(before);
      expect(written).toBeLessThanOrEqual(Date.now());
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('llena los marcadores del mensaje con los params', () => {
      const error = twoLanguages.create(
        { statusCode: 400, code: 'TOO_SHORT', params: { minimum: 3 } },
        '/x',
      );

      expect(error.message).toBe('Mínimo 3.');
    });

    it('un código sin texto usa el del estado, para no quedar sin mensaje', () => {
      const error = errors.create(
        { statusCode: 403, code: 'CODIGO_NUEVO' },
        '/x',
      );

      expect(error).toMatchObject({
        code: 'CODIGO_NUEVO',
        message: 'No tienes permiso para hacer esto.',
      });
    });

    it('si tampoco el estado tiene texto usa el genérico', () => {
      const error = twoLanguages.create(
        { statusCode: 409, code: 'CODIGO_NUEVO' },
        '/x',
      );

      expect(error.message).toBe('Algo falló.');
    });

    it('sale en el idioma de la petición, con el respaldo de cada texto en el de por defecto', () => {
      const error = (code: string) =>
        runWithLanguage('en', () =>
          twoLanguages.create({ statusCode: 404, code }, '/x'),
        );

      expect(error('NOT_FOUND').message).toBe('We could not find it.');
      expect(error('FORBIDDEN').message).toBe('Sin permiso.');
    });
  });

  describe('los issues de un VALIDATION_FAILED', () => {
    const details = (message: string, params?: Record<string, string>) => ({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      issues: [{ path: ['name', 0], message, params }],
    });

    it('un mensaje que es clave del catálogo se traduce con sus params', () => {
      const error = twoLanguages.create(
        details('validation.too_small.string', { minimum: '3' }),
        '/x',
      );

      expect(error.issues).toEqual([
        { path: ['name', 0], message: 'La longitud mínima es 3.' },
      ]);
    });

    it('un mensaje que el schema ya escribió sale tal cual', () => {
      const error = twoLanguages.create(
        details('Ingresa un celular colombiano válido.'),
        '/x',
      );

      expect(error.issues?.[0]?.message).toBe(
        'Ingresa un celular colombiano válido.',
      );
    });

    it('cada issue sale en el idioma de la petición', () => {
      const error = runWithLanguage('en', () =>
        twoLanguages.create(
          details('validation.too_small.string', { minimum: '3' }),
          '/x',
        ),
      );

      expect(error.issues?.[0]?.message).toBe('The minimum length is 3.');
    });

    it('solo salen la ruta y el mensaje: los params no viajan', () => {
      const error = twoLanguages.create(
        details('validation.too_small.string', { minimum: '3' }),
        '/x',
      );

      expect(Object.keys(error.issues?.[0] ?? {}).sort()).toEqual([
        'message',
        'path',
      ]);
    });

    it('sin issues es null, y con una lista vacía, una lista vacía', () => {
      const none = errors.create(
        { statusCode: 400, code: 'BAD_REQUEST' },
        '/x',
      );
      const empty = errors.create(
        { statusCode: 400, code: 'VALIDATION_FAILED', issues: [] },
        '/x',
      );

      expect(none.issues).toBeNull();
      expect(empty.issues).toEqual([]);
    });
  });

  describe('language', () => {
    it('es el idioma en que salen los mensajes de la petición en curso', () => {
      expect(errors.language).toBe('es');
      expect(runWithLanguage('en', () => twoLanguages.language)).toBe('en');
    });
  });
});
