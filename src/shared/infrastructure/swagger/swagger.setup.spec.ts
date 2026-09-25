import { Body, Controller, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DOCS_PATH,
  setupSwagger,
} from '@/shared/infrastructure/swagger/swagger.setup.js';
import { listenOnLoopback } from '@test/support/loopback.js';

const EchoSchema = z.strictObject({ name: z.string().min(1) });

@Controller()
class ProbeController {
  @Post('echo')
  echo(@Body({ schema: EchoSchema }) body: z.output<typeof EchoSchema>) {
    return body;
  }
}

describe('setupSwagger', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupSwagger(app, '1');
    await app.init();
    await listenOnLoopback(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);

  it('publica la interfaz en la ruta de la documentación', async () => {
    const response = await get(`/${DOCS_PATH}`).expect(200);

    expect(response.type).toBe('text/html');
  });

  it('publica el documento OpenAPI con el título y la versión de la API', async () => {
    const { body } = await get(`/${DOCS_PATH}/openapi.json`).expect(200);

    expect(body.openapi).toMatch(/^3\./);
    expect(body.info).toMatchObject({ title: 'Fiaro API', version: '1' });
  });

  it('explica cómo elegir la versión de la API', async () => {
    const { body } = await get(`/${DOCS_PATH}/openapi.json`).expect(200);

    expect(body.info.description).toContain('`API-Version`');
    expect(body.info.description).toContain('versión 1');
  });

  it('describe cada ruta a partir del schema de Zod que declara', async () => {
    const { body } = await get(`/${DOCS_PATH}/openapi.json`).expect(200);

    const schema =
      body.paths['/echo'].post.requestBody.content['application/json'].schema;
    expect(schema.properties.name.type).toBe('string');
    expect(schema.required).toContain('name');
  });

  it.each(['/docs-json', '/docs-yaml', `/${DOCS_PATH}/openapi.yaml`])(
    'no publica el documento en otras rutas (%s)',
    async (path) => {
      const response = await get(path);

      expect(response.status).toBe(404);
    },
  );
});
