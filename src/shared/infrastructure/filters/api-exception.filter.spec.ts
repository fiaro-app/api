import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiErrorSchema } from '@fiaro-app/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiExceptionFilter } from '@/shared/infrastructure/filters/api-exception.filter.js';
import { realApiErrors } from '@test/support/api-errors.js';
import { FakeExpressResponse } from '@test/support/fake-express-response.js';

/** Lo que responde el filtro ante una excepción, y lo que escribió en el log. */
function respondTo(
  exception: unknown,
  { url = '/loans/1?token=secreto', headersSent = false } = {},
) {
  const res = new FakeExpressResponse();
  res.headersSent = headersSent;
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl: url }),
      getResponse: () => res.asResponse(),
    }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter(realApiErrors()).catch(exception, host);
  return res;
}

describe('ApiExceptionFilter', () => {
  const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {
    return undefined;
  });

  afterEach(() => {
    logged.mockClear();
  });

  it('responde el error de la API con el estado de la excepción y el mensaje del catálogo', () => {
    const res = respondTo(new NotFoundException('Cannot GET /loans/1'));

    expect(res.statusCode).toBe(404);
    expect(res.jsonBody).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'No encontramos lo que buscas.',
      issues: null,
    });
    expect(ApiErrorSchema.safeParse(res.jsonBody).success).toBe(true);
  });

  it('nunca repite el mensaje de la excepción: el texto sale siempre del catálogo', () => {
    const res = respondTo(new ForbiddenException('Cannot GET /loans/1'));

    expect(JSON.stringify(res.jsonBody)).not.toContain('Cannot GET');
  });

  it('la ruta sale sin la cadena de consulta, que puede traer datos sensibles', () => {
    const res = respondTo(new NotFoundException());

    expect(res.jsonBody).toMatchObject({ path: '/loans/1' });
    expect(JSON.stringify(res.jsonBody)).not.toContain('secreto');
  });

  it('dice en qué idioma salió el texto y que cambia según Accept-Language', () => {
    const res = respondTo(new NotFoundException());

    expect(res.headers.get('content-language')).toBe('es');
    expect(res.varyValue).toBe('Accept-Language');
  });

  it('traduce el detalle por campo de un VALIDATION_FAILED', () => {
    const res = respondTo(
      new BadRequestException({
        code: 'VALIDATION_FAILED',
        issues: [
          {
            path: ['name'],
            message: 'validation.too_small.string',
            params: { minimum: '3' },
          },
          { path: ['phone'], message: 'Ingresa un celular válido.' },
        ],
      }),
    );

    expect(res.jsonBody).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Los datos enviados no son válidos.',
      issues: [
        { path: ['name'], message: 'La longitud mínima es 3.' },
        { path: ['phone'], message: 'Ingresa un celular válido.' },
      ],
    });
  });

  describe('un error del servidor', () => {
    it('responde 500 INTERNAL_ERROR sin revelar nada de la excepción', () => {
      const res = respondTo(
        new Error('password authentication failed for user "fiaro"'),
      );

      expect(res.statusCode).toBe(500);
      expect(res.jsonBody).toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message:
          'Algo salió mal de nuestro lado. Intenta de nuevo en unos minutos.',
      });
      expect(JSON.stringify(res.jsonBody)).not.toContain('password');
    });

    it('escribe la excepción en el log con su traza', () => {
      const error = new Error('falló');

      respondTo(error);

      expect(logged).toHaveBeenCalledExactlyOnceWith(error);
    });

    it('escribe también lo que se lanzó sin ser un Error', () => {
      respondTo('texto suelto');

      expect(logged).toHaveBeenCalledExactlyOnceWith("'texto suelto'");
    });
  });

  it('un error del cliente (4xx) no se escribe en el log: ya queda en la línea de la petición', () => {
    respondTo(new NotFoundException());
    respondTo(new BadRequestException());

    expect(logged).not.toHaveBeenCalled();
  });

  it('un error con estado HTTP de otra librería (JSON mal formado, cuerpo muy grande) conserva su estado', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      statusCode: 413,
    });

    const res = respondTo(tooLarge);

    expect(res.statusCode).toBe(413);
    expect(res.jsonBody).toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Los datos enviados son demasiado grandes.',
    });
    expect(logged).not.toHaveBeenCalled();
  });

  it('si la respuesta ya empezó a enviarse solo la cierra', () => {
    const res = respondTo(new NotFoundException(), { headersSent: true });

    expect(res.ended).toBe(true);
    expect(res.jsonBody).toBeUndefined();
    expect(res.headers.size).toBe(0);
  });
});
