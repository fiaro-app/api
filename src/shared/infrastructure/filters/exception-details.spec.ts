import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { InvalidPasswordError } from '@/modules/auth/domain/errors/invalid-password.error.js';
import { InvalidUserDataError } from '@/modules/auth/domain/errors/invalid-user-data.error.js';
import { PhoneAlreadyRegisteredError } from '@/modules/auth/domain/errors/phone-already-registered.error.js';
import {
  DomainError,
  type DomainErrorDetail,
  type DomainErrorKind,
} from '@/shared/domain/errors/domain-error.js';
import {
  codeForStatus,
  describeException,
  errorCodeFor,
  providerErrorCode,
} from '@/shared/infrastructure/filters/exception-details.js';

/** Un error de dominio de prueba de la categoría que se pida. */
class ProbeDomainError extends DomainError {
  readonly code = 'PROBE_FAILED';
  readonly errorCode = 'P999U';

  constructor(
    readonly kind: DomainErrorKind,
    detail?: DomainErrorDetail,
  ) {
    super('falló la prueba', detail);
  }
}

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
  describe('un error de dominio', () => {
    it.each([
      ['INVALID', 400],
      ['NOT_FOUND', 404],
      ['CONFLICT', 409],
      ['FORBIDDEN', 403],
      ['RULE_VIOLATED', 422],
      ['UNAVAILABLE', 503],
    ] as const)('de la categoría %s responde %i', (kind, statusCode) => {
      expect(describeException(new ProbeDomainError(kind))).toMatchObject({
        statusCode,
        code: 'PROBE_FAILED',
      });
    });

    it('lleva su código, sus params y su detalle por campo', () => {
      const details = describeException(
        new ProbeDomainError('INVALID', {
          params: { limit: 5 },
          issues: [
            {
              path: ['name', 0],
              message: 'validation.too_small.string',
              params: { minimum: '3' },
            },
          ],
        }),
      );

      expect(details).toMatchObject({
        statusCode: 400,
        code: 'PROBE_FAILED',
        params: { limit: 5 },
        issues: [
          {
            path: ['name', 0],
            message: 'validation.too_small.string',
            params: { minimum: '3' },
          },
        ],
      });
    });

    it('sin detalle no lleva params ni issues', () => {
      expect(describeException(new ProbeDomainError('CONFLICT'))).toMatchObject(
        {
          statusCode: 409,
          code: 'PROBE_FAILED',
          params: undefined,
          issues: undefined,
        },
      );
    });

    it('nunca lleva el mensaje del error: es para el log, no para la persona', () => {
      const details = describeException(new ProbeDomainError('INVALID'));

      expect(JSON.stringify({ ...details, cause: undefined })).not.toContain(
        'falló la prueba',
      );
      expect(details.cause).toBe('falló la prueba');
    });

    it('el celular repetido es un 409 PHONE_ALREADY_REGISTERED', () => {
      expect(
        describeException(new PhoneAlreadyRegisteredError()),
      ).toMatchObject({ statusCode: 409, code: 'PHONE_ALREADY_REGISTERED' });
    });

    it('la contraseña de longitud inválida es un 400 con el rango como params', () => {
      expect(describeException(new InvalidPasswordError(8, 128))).toMatchObject(
        {
          statusCode: 400,
          code: 'INVALID_PASSWORD_LENGTH',
          params: { minLength: 8, maxLength: 128 },
        },
      );
    });

    it('los datos de la persona inválidos son un 400 VALIDATION_FAILED con un issue por campo', () => {
      const issues = [
        { path: ['email'], message: 'validation.invalid_format.email' },
      ];

      expect(describeException(new InvalidUserDataError(issues))).toMatchObject(
        {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          issues: [
            { path: ['email'], message: 'validation.invalid_format.email' },
          ],
        },
      );
    });
  });

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
      expect(
        describeException(new NotFoundException('Cannot GET /x')),
      ).toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        params: undefined,
        issues: undefined,
      });
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

      expect(details).toMatchObject({
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

      expect(details).toMatchObject({
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
      expect(describeException(httpError(413))).toMatchObject({
        statusCode: 413,
        code: 'PAYLOAD_TOO_LARGE',
      });
      expect(describeException(httpError(400))).toMatchObject({
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
    });

    it.each([200, 399, 600, 0])(
      'un estado fuera de 400-599 (%i) es un error del servidor',
      (statusCode) => {
        expect(describeException(httpError(statusCode))).toMatchObject({
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
    expect(describeException(thrown)).toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });
  });
});

describe('el código único de un error (D-134)', () => {
  it('un error de dominio lleva el de su clase, aunque comparta `code` con otros', () => {
    expect(describeException(new PhoneAlreadyRegisteredError()).errorCode).toBe(
      'A010A',
    );
    expect(describeException(new ProbeDomainError('CONFLICT')).errorCode).toBe(
      'P999U',
    );
  });

  it('una excepción de Nest toma el genérico de su código o de su estado', () => {
    expect(describeException(new NotFoundException()).errorCode).toBe('P104A');
    expect(
      describeException(new BadRequestException({ code: 'VALIDATION_FAILED' }))
        .errorCode,
    ).toBe('P106V');
    expect(errorCodeFor('CODIGO_QUE_NO_EXISTE')).toBe('P115U');
  });

  it('un error inesperado se atribuye al proveedor que lo causó por el nombre de su clase', () => {
    class PrismaClientKnownRequestError extends Error {}
    class MongoServerError extends Error {}
    class ReplyError extends Error {}
    class S3ServiceException extends Error {}
    class ResendError extends Error {}
    class ExpoPushError extends Error {}

    expect(providerErrorCode(new PrismaClientKnownRequestError('x'))).toBe(
      'P910D',
    );
    expect(providerErrorCode(new MongoServerError('x'))).toBe('P912M');
    expect(providerErrorCode(new ReplyError('x'))).toBe('P911R');
    expect(providerErrorCode(new S3ServiceException('x'))).toBe('P913S');
    expect(providerErrorCode(new ResendError('x'))).toBe('P914E');
    expect(providerErrorCode(new ExpoPushError('x'))).toBe('P915X');
    expect(providerErrorCode(new Error('cualquier otra cosa'))).toBe('P900U');
    expect(providerErrorCode('un texto')).toBe('P900U');
    expect(
      describeException(new PrismaClientKnownRequestError('x')).errorCode,
    ).toBe('P910D');
  });

  it('el mensaje de la excepción queda en `cause`, recortado, y sin mensaje no hay `cause`', () => {
    expect(describeException(new Error('a'.repeat(500))).cause).toHaveLength(
      300,
    );
    expect(describeException(new Error('')).cause).toBeUndefined();
    expect(describeException('no es un Error').cause).toBeUndefined();
  });
});
