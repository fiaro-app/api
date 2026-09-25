import { describe, expect, it } from 'vitest';
import { useSecurityApp } from '@test/support/security-app.js';

const startApp = useSecurityApp();

describe('versionado por cabecera', () => {
  it('sin cabecera sirve la versión por defecto: las apps ya instaladas no la envían', async () => {
    const api = await startApp();

    const { body } = await api.get('/probe/ping').expect(200);

    expect(body).toEqual({ version: 1 });
  });

  it('las rutas no llevan prefijo de versión', async () => {
    const api = await startApp();

    const { status } = await api.get('/v1/probe/ping');

    expect(status).toBe(404);
  });

  it('la cabecera elige la versión', async () => {
    const api = await startApp();

    const v1 = await api.get('/probe/ping').set('API-Version', '1').expect(200);
    const v2 = await api.get('/probe/ping').set('API-Version', '2').expect(200);

    expect(v1.body).toEqual({ version: 1 });
    expect(v2.body).toEqual({ version: 2 });
  });

  it('una ruta que declara la versión 1 también responde sin cabecera', async () => {
    const api = await startApp();

    const withoutHeader = await api.get('/probe/explicit-v1');
    const withHeader = await api
      .get('/probe/explicit-v1')
      .set('API-Version', '1');

    expect(withoutHeader.status).toBe(200);
    expect(withHeader.status).toBe(200);
  });

  it('una versión que la ruta no tiene responde 404', async () => {
    const api = await startApp();

    const unknownVersion = await api.get('/probe/ping').set('API-Version', '9');
    const routeWithoutV2 = await api
      .get('/probe/other')
      .set('API-Version', '2');

    expect(unknownVersion.status).toBe(404);
    expect(routeWithoutV2.status).toBe(404);
  });

  it('las rutas VERSION_NEUTRAL responden con cualquier versión y sin ella', async () => {
    const api = await startApp();

    const withoutHeader = await api.get('/neutral');
    const withVersion = await api.get('/neutral').set('API-Version', '9');

    expect(withoutHeader.status).toBe(200);
    expect(withVersion.status).toBe(200);
  });

  it('avisa a las caches con Vary de que la respuesta depende de la versión', async () => {
    const api = await startApp();

    const { headers } = await api.get('/probe/ping').expect(200);

    expect(headers.vary).toContain('API-Version');
  });
});
