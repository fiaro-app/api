import {
  Controller,
  Get,
  HttpCode,
  type INestApplication,
  Req,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { setAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { createHttpLogger } from '@/shared/infrastructure/logging/http-logger.js';
import { createLogger } from '@/shared/infrastructure/logging/logger.factory.js';
import { currentRequestContext } from '@/shared/infrastructure/logging/request-context.js';
import { captureLogs } from '@test/support/log-capture.js';

@Controller()
class ProbeController {
  @Get('ok/:id')
  ok() {
    return { requestId: currentRequestContext()?.requestId };
  }

  @Get('mine')
  mine(@Req() req: Request) {
    setAuthenticatedSession(req, {
      id: 's1',
      user: {
        id: 'u1',
        phone: '+573001234567',
        fullName: 'Ana Pérez',
        mustChangePassword: false,
      },
    });
    return {};
  }

  @Get('boom')
  @HttpCode(500)
  boom() {
    return { error: true };
  }
}

describe('createHttpLogger', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function buildApp() {
    const logs = captureLogs();
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.use(
      createHttpLogger(
        createLogger({ level: 'info', destination: logs.destination }),
      ),
    );
    await app.init();
    return {
      http: request(app.getHttpServer()),
      /** Lo que se escribió sobre las peticiones (otros avisos no cuentan). */
      requests: () =>
        logs.entries().filter((entry) => entry.msg === 'request completed'),
      text: logs.text,
    };
  }

  it('escribe una línea por petición con método, ruta, estado, tiempo y cliente', async () => {
    const { http, requests } = await buildApp();

    await http.get('/ok/5?debug=1').set('User-Agent', 'prueba-de-log');

    const [entry, ...rest] = requests();
    expect(rest).toEqual([]);
    expect(entry).toMatchObject({
      level: 'info',
      route: '/ok/:id',
      req: { method: 'GET', path: '/ok/5', userAgent: 'prueba-de-log' },
      res: { statusCode: 200 },
    });
    expect(entry?.responseTime).toEqual(expect.any(Number));
  });

  it('del request escribe solo los campos elegidos', async () => {
    const { http, requests } = await buildApp();

    await http.get('/ok/5').set('User-Agent', 'prueba-de-log');

    expect(Object.keys(requests()[0]?.req as object).sort()).toEqual([
      'id',
      'ip',
      'method',
      'path',
      'userAgent',
    ]);
  });

  it('el identificador del log es el de la cabecera y el que ve el código que atiende', async () => {
    const { http, requests } = await buildApp();

    const response = await http.get('/ok/5');

    const id = response.headers['x-request-id'];
    expect(id).toEqual(expect.any(String));
    expect(requests()[0]).toMatchObject({ req: { id }, requestId: id });
    expect(response.body).toEqual({ requestId: id });
  });

  it('respeta el identificador que envía el cliente', async () => {
    const { http, requests } = await buildApp();

    const response = await http
      .get('/ok/5')
      .set('X-Request-Id', 'cliente-1234567890');

    expect(response.headers['x-request-id']).toBe('cliente-1234567890');
    expect(requests()[0]).toMatchObject({ req: { id: 'cliente-1234567890' } });
  });

  it('una ruta que nadie atiende se registra como warn y sin plantilla de ruta', async () => {
    const { http, requests } = await buildApp();

    await http.get('/no-existe');

    const [entry] = requests();
    expect(entry).toMatchObject({
      level: 'warn',
      req: { path: '/no-existe' },
      res: { statusCode: 404 },
    });
    expect(entry).not.toHaveProperty('route');
  });

  it('un error del servidor se registra como error, con el mismo mensaje y sin el error inventado por la librería', async () => {
    const { http, requests } = await buildApp();

    await http.get('/boom');

    const [entry] = requests();
    expect(entry).toMatchObject({
      level: 'error',
      route: '/boom',
      res: { statusCode: 500 },
    });
    expect(entry).not.toHaveProperty('err');
  });

  it('dice qué persona hizo la petición cuando trae una sesión', async () => {
    const { http, requests } = await buildApp();

    await http.get('/mine');

    expect(requests()[0]).toMatchObject({ userId: 'u1' });
  });

  it('no dice ninguna persona cuando no hay sesión', async () => {
    const { http, requests } = await buildApp();

    await http.get('/ok/5');

    expect(requests()[0]).not.toHaveProperty('userId');
  });

  it('no escribe la cadena de consulta, la cookie ni la autorización', async () => {
    const { http, text } = await buildApp();

    await http
      .get('/ok/5?token=secreto-en-la-url')
      .set('Cookie', 'fiaro.session_token=secreto-en-la-cookie')
      .set('Authorization', 'Bearer secreto-en-la-cabecera');

    expect(text()).not.toContain('secreto');
  });
});
