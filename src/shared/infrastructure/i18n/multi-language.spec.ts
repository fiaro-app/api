import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiErrorFactory } from '@/shared/infrastructure/filters/api-error.factory.js';
import { ApiExceptionFilter } from '@/shared/infrastructure/filters/api-exception.filter.js';
import { SchemaValidationPipe } from '@/shared/infrastructure/http/schema-validation.pipe.js';
import { createLanguageMiddleware } from '@/shared/infrastructure/i18n/language.middleware.js';
import { FLAT_CATALOGS } from '@/shared/infrastructure/i18n/message-catalog.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';
import { configureZodMessages } from '@/shared/infrastructure/i18n/zod-messages.js';

const NoteSchema = z.strictObject({ name: z.string().min(3) });

@Controller('probe')
class ProbeController {
  @Get('missing')
  missing(): never {
    throw new NotFoundException();
  }

  @Get('protected')
  protectedRoute(): never {
    throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
  }

  @Post('echo')
  echo(@Body({ schema: NoteSchema }) body: z.output<typeof NoteSchema>) {
    return body;
  }
}

/**
 * Los textos reales en español más un inglés de mentira que solo traduce algunas claves: prueba
 * que agregar un idioma es agregar un catálogo, sin tocar el resto del código.
 */
const CATALOGS = {
  es: FLAT_CATALOGS.es ?? {},
  en: {
    'errors.NOT_FOUND': 'We could not find what you are looking for.',
    'errors.BAD_REQUEST': 'The request is not valid.',
    'errors.PAYLOAD_TOO_LARGE': 'The data is too large.',
    'errors.VALIDATION_FAILED': 'The data sent is not valid.',
    'validation.too_small.string': 'The minimum length is {minimum}.',
    'validation.unrecognized_keys': 'Unexpected field: {keys}.',
  },
};

describe('una API con dos idiomas', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        {
          provide: TranslationService,
          useValue: new TranslationService(CATALOGS),
        },
        ApiErrorFactory,
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    app.use(createLanguageMiddleware(['es', 'en']));
    configureZodMessages();
    app.useGlobalPipes(new SchemaValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = () => request(app.getHttpServer());

  it('responde en el idioma que pide Accept-Language', async () => {
    const english = await api()
      .get('/probe/missing')
      .set('Accept-Language', 'en')
      .expect(404);
    const spanish = await api()
      .get('/probe/missing')
      .set('Accept-Language', 'es')
      .expect(404);

    expect(english.body.message).toBe(
      'We could not find what you are looking for.',
    );
    expect(english.headers['content-language']).toBe('en');
    expect(spanish.body.message).toBe('No encontramos lo que buscas.');
    expect(spanish.headers['content-language']).toBe('es');
  });

  it('elige según la preferencia: el de mayor peso que la API hable, y el de por defecto si ninguno', async () => {
    const preferred = await api()
      .get('/probe/missing')
      .set('Accept-Language', 'fr, en;q=0.8, es;q=0.4');
    const unknown = await api()
      .get('/probe/missing')
      .set('Accept-Language', 'fr, de;q=0.5');

    expect(preferred.headers['content-language']).toBe('en');
    expect(unknown.headers['content-language']).toBe('es');
    expect(unknown.body.message).toBe('No encontramos lo que buscas.');
  });

  it('un texto que el idioma no traduce sale en el idioma de por defecto, no como una clave', async () => {
    const { body } = await api()
      .get('/probe/protected')
      .set('Accept-Language', 'en')
      .expect(401);

    expect(body).toMatchObject({
      code: 'UNAUTHENTICATED',
      message: 'Inicia sesión para continuar.',
    });
  });

  it('la respuesta dice que varía según Accept-Language', async () => {
    const { headers } = await api().get('/probe/missing');

    expect(headers.vary).toContain('Accept-Language');
  });

  it('traduce el detalle de la validación con los valores de cada falla', async () => {
    const { body } = await api()
      .post('/probe/echo')
      .set('Accept-Language', 'en')
      .send({ name: 'a', extra: 1 })
      .expect(400);

    expect(body).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The data sent is not valid.',
    });
    const { issues } = body as { issues: { message: string }[] };
    expect(issues.map((issue) => issue.message).sort()).toEqual([
      'The minimum length is 3.',
      'Unexpected field: extra.',
    ]);
  });

  describe('el idioma sobrevive a la lectura del cuerpo', () => {
    it('con un JSON mal formado', async () => {
      const { body } = await api()
        .post('/probe/echo')
        .set('Accept-Language', 'en')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);

      expect(body).toMatchObject({
        code: 'BAD_REQUEST',
        message: 'The request is not valid.',
      });
    });

    it('con un cuerpo demasiado grande', async () => {
      const { body } = await api()
        .post('/probe/echo')
        .set('Accept-Language', 'en')
        .send({ name: 'x'.repeat(200_000) })
        .expect(413);

      expect(body).toMatchObject({
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The data is too large.',
      });
    });
  });
});
