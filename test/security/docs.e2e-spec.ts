import { describe, expect, it } from 'vitest';
import { useSecurityApp } from '@test/support/security-app.js';

const startApp = useSecurityApp();

describe('documentación', () => {
  it('publica la interfaz y el documento OpenAPI con las rutas sin prefijo', async () => {
    const api = await startApp();

    await api.get('/docs').expect(200);
    const { body } = await api.get('/docs/openapi.json').expect(200);

    expect(body.openapi).toBe('3.2.0');
    expect(body.paths['/probe/ping'].get).toBeDefined();
    expect(body.paths['/probe/search'].query).toBeDefined();
    expect(body.paths['/neutral'].get).toBeDefined();
    expect(body.paths['/v1/probe/ping']).toBeUndefined();
  });

  it('describe el body de cada ruta con el schema de su contrato', async () => {
    const api = await startApp();

    const { body } = await api.get('/docs/openapi.json').expect(200);

    const schema =
      body.paths['/probe/echo'].post.requestBody.content['application/json']
        .schema;
    expect(schema.required).toEqual(['name']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('no se publica cuando está desactivada', async () => {
    const api = await startApp({ swaggerEnabled: false });

    const ui = await api.get('/docs');
    const document = await api.get('/docs/openapi.json');

    expect(ui.status).toBe(404);
    expect(document.status).toBe(404);
  });
});
