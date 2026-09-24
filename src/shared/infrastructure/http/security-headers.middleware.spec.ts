import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSecurityHeaders } from './security-headers.middleware.js';

@Controller()
class ProbeController {
  @Get('api/ping')
  ping() {
    return { ok: true };
  }

  @Get('docs')
  docs() {
    return '<html></html>';
  }

  @Get('docs/asset.js')
  asset() {
    return 'void 0;';
  }

  @Get('documents')
  documents() {
    return { ok: true };
  }
}

const API_CSP =
  "default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'";

describe('createSecurityHeaders', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.use(createSecurityHeaders('docs'));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path);

  it('las respuestas de la API no pueden cargar nada ni ir en un iframe', async () => {
    const { headers } = await get('/api/ping').expect(200);

    expect(headers['content-security-policy']).toBe(API_CSP);
  });

  it('agrega las demás cabeceras de seguridad y no anuncia el framework', async () => {
    const { headers } = await get('/api/ping');

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['referrer-policy']).toBe('no-referrer');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('también las agrega en las rutas que no existen', async () => {
    const { headers } = await get('/no-existe').expect(404);

    expect(headers['content-security-policy']).toBe(API_CSP);
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it.each(['/docs', '/docs/asset.js'])(
    'la interfaz de la documentación (%s) puede cargar sus propios recursos',
    async (path) => {
      const { headers } = await get(path).expect(200);
      const csp = String(headers['content-security-policy']);

      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("default-src 'none'");
      expect(csp).not.toContain('upgrade-insecure-requests');
      expect(headers['x-content-type-options']).toBe('nosniff');
    },
  );

  it('no confunde una ruta que solo empieza igual con la documentación', async () => {
    const { headers } = await get('/documents').expect(200);

    expect(headers['content-security-policy']).toBe(API_CSP);
  });
});
