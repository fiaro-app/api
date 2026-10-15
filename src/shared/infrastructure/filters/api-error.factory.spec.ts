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
  { nodeEnv: 'test' },
);

describe('ApiErrorFactory', () => {
  const errors = realApiErrors();

  describe('create', () => {
    it('arma el error del contrato: estado, código, mensaje del catálogo, ruta y hora', () => {
      const error = errors.create(
        { statusCode: 404, code: 'NOT_FOUND', errorCode: 'P999U' },
        '/loans/1',
      );

      expect(error).toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        errorCode: 'P999U',
        message: 'No encontramos lo que buscas.',
        path: '/loans/1',
        timestamp: expect.any(String),
        issues: null,
        requestId: null,
      });
      expect(ApiErrorSchema.parse(error)).toMatchObject(
        ApiErrorSchema.parse(error),
      );
    });

    it('la hora es el instante en que se arma, en ISO 8601', () => {
      const before = Date.now();

      const { timestamp } = errors.create(
        { statusCode: 500, code: 'INTERNAL_ERROR', errorCode: 'P999U' },
        '/x',
      );

      const written = new Date(timestamp).getTime();
      expect(written).toBeGreaterThanOrEqual(before);
      expect(written).toBeLessThanOrEqual(Date.now());
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('llena los marcadores del mensaje con los params', () => {
      const error = twoLanguages.create(
        {
          statusCode: 400,
          code: 'TOO_SHORT',
          errorCode: 'P999U',
          params: { minimum: 3 },
        },
        '/x',
      );

      expect(error.message).toBe('Mínimo 3.');
    });

    it('un código sin texto usa el del estado, para no quedar sin mensaje', () => {
      const error = errors.create(
        { statusCode: 403, code: 'CODIGO_NUEVO', errorCode: 'P999U' },
        '/x',
      );

      expect(error).toMatchObject({
        code: 'CODIGO_NUEVO',
        message: 'No tienes permiso para hacer esto.',
      });
    });

    it('si tampoco el estado tiene texto usa el genérico', () => {
      const error = twoLanguages.create(
        { statusCode: 409, code: 'CODIGO_NUEVO', errorCode: 'P999U' },
        '/x',
      );

      expect(error.message).toBe('Algo falló.');
    });

    it('sale en el idioma de la petición, con el respaldo de cada texto en el de por defecto', () => {
      const error = (code: string) =>
        runWithLanguage('en', () =>
          twoLanguages.create(
            { statusCode: 404, code, errorCode: 'P999U' },
            '/x',
          ),
        );

      expect(error('NOT_FOUND').message).toBe('We could not find it.');
      expect(error('FORBIDDEN').message).toBe('Sin permiso.');
    });
  });

  describe('lo que sale en producción y lo que no (D-134)', () => {
    const details = {
      statusCode: 404,
      code: 'NOT_FOUND',
      errorCode: 'L003A',
      cause: 'El préstamo 0198 no existe.',
    };

    it('en producción: el código único y el requestId sí, la explicación nunca', () => {
      const error = realApiErrors('production').create(details, '/loans/1');

      expect(error.errorCode).toBe('L003A');
      expect(error).toHaveProperty('requestId');
      expect(error).not.toHaveProperty('debug');
      expect(JSON.stringify(error)).not.toContain('0198');
      expect(JSON.stringify(error)).not.toMatch(/Id viejo/);
    });

    it('fuera de producción: `debug` explica qué es el error, qué mirar y lo que dijo la excepción', () => {
      const error = realApiErrors('development').create(details, '/loans/1');

      expect(error.debug).toEqual({
        title: 'El préstamo no existe para este negocio.',
        hint: expect.stringContaining('Id viejo'),
        cause: 'El préstamo 0198 no existe.',
      });
    });

    it('un código fuera del catálogo no rompe: `debug` sale con nulos', () => {
      const error = realApiErrors('development').create(
        { ...details, errorCode: 'Z999Z', cause: undefined },
        '/x',
      );

      expect(error.debug).toEqual({ title: null, hint: null, cause: null });
    });

    it('annotate deja en la respuesta lo que va al log, también en producción', () => {
      const res = { locals: {} as Record<string, unknown> };

      realApiErrors('production').annotate(res as never, details);

      expect(res.locals.errorLog).toEqual({
        errorCode: 'L003A',
        errorTitle: 'El préstamo no existe para este negocio.',
        errorHint: expect.stringContaining('Id viejo'),
        errorCause: 'El préstamo 0198 no existe.',
      });
    });
  });

  describe('los issues de un VALIDATION_FAILED', () => {
    const details = (message: string, params?: Record<string, string>) => ({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      errorCode: 'P106V',
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
        { statusCode: 400, code: 'BAD_REQUEST', errorCode: 'P999U' },
        '/x',
      );
      const empty = errors.create(
        {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          errorCode: 'P106V',
          issues: [],
        },
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
