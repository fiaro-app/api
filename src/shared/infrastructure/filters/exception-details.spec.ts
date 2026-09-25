import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  codeForStatus,
  describeException,
} from '@/shared/infrastructure/filters/exception-details.js';

describe('codeForStatus', () => {
  it.each([
    [400, 'BAD_REQUEST'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [405, 'METHOD_NOT_ALLOWED'],
    [409, 'CONFLICT'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [415, 'UNSUPPORTED_MEDIA_TYPE'],
    [429, 'RATE_LIMITED'],
    [500, 'INTERNAL_ERROR'],
    [502, 'INTERNAL_ERROR'],
    [503, 'INTERNAL_ERROR'],
    [418, 'UNKNOWN'],
  ])('%i es %s', (status, code) => {
    expect(codeForStatus(status)).toBe(code);
  });
});

describe('describeException', () => {
  describe('una excepción de Nest', () => {
    it('conserva su estado y toma el código del cuerpo', () => {
      const details = describeException(
        new HttpException({ code: 'LOAN_NOT_FOUND' }, 404),
      );

      expect(details).toMatchObject({
        statusCode: 404,
        code: 'LOAN_NOT_FOUND',
      });
    });

    it('sin código en el cuerpo lo deduce del estado, como el 404 de una ruta que no existe', () => {
      expect(describeException(new NotFoundException('Cannot GET /x'))).toEqual(
        {
          statusCode: 404,
          code: 'NOT_FOUND',
          params: undefined,
          issues: undefined,
        },
      );
    });

    it('lleva los params y los issues del cuerpo', () => {
      const issues = [
        {
          path: ['name'],
          message: 'validation.too_small.string',
          params: { minimum: '3' },
        },
      ];

      const details = describeException(
        new BadRequestException({
          code: 'VALIDATION_FAILED',
          params: { limit: 5 },
          issues,
        }),
      );

      expect(details).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        params: { limit: 5 },
        issues,
      });
    });

    it.each([
      ['un código que no es texto', { code: 42 }],
      ['unos issues mal formados', { code: 'VALIDATION_FAILED', issues: 'x' }],
      [
        'unos params con valores que no son texto ni número',
        { params: { a: {} } },
      ],
      ['un texto suelto', 'no soy un objeto'],
    ])('ignora %s y deduce el código del estado', (_case, body) => {
      const details = describeException(new HttpException(body, 400));

      expect(details).toEqual({
        statusCode: 400,
        code: 'BAD_REQUEST',
        params: undefined,
        issues: undefined,
      });
    });
  });

  describe('un error de otra librería', () => {
    const httpError = (statusCode: number) =>
      Object.assign(new Error('mensaje interno'), { statusCode });

    it('conserva el estado HTTP que trae, como los errores de body-parser', () => {
      expect(describeException(httpError(413))).toEqual({
        statusCode: 413,
        code: 'PAYLOAD_TOO_LARGE',
      });
      expect(describeException(httpError(400))).toEqual({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    });

    it.each([200, 399, 600, 0])(
      'un estado fuera de 400-599 (%i) es un error del servidor',
      (statusCode) => {
        expect(describeException(httpError(statusCode))).toEqual({
          statusCode: 500,
          code: 'INTERNAL_ERROR',
        });
      },
    );
  });

  it.each([
    ['un Error corriente', new Error('boom')],
    ['un texto', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['un objeto sin estado', {}],
    ['un objeto con un estado que no es número', { statusCode: '404' }],
  ])('%s es un 500 INTERNAL_ERROR', (_case, thrown) => {
    expect(describeException(thrown)).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  });
});
