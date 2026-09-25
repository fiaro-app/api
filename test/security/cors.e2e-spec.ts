import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ORIGIN,
  OTHER_ORIGIN,
  useSecurityApp,
} from '@test/support/security-app.js';

const startApp = useSecurityApp();

describe('CORS', () => {
  it('acepta el preflight de QUERY con la cabecera de versión desde un origen permitido', async () => {
    const api = await startApp();

    const { headers } = await api
      .options('/probe/search')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'QUERY')
      .set('Access-Control-Request-Headers', 'content-type, api-version')
      .expect(204);

    expect(headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(headers['access-control-allow-methods']).toContain('QUERY');
    expect(headers['access-control-allow-headers']).toContain('Content-Type');
    expect(headers['access-control-allow-headers']).toContain('API-Version');
    expect(headers['access-control-allow-credentials']).toBe('true');
    expect(headers['access-control-max-age']).toBe('600');
  });

  it('expone a la web las cabeceras de reintento', async () => {
    const api = await startApp();

    const { headers } = await api
      .get('/probe/ping')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(headers['access-control-expose-headers']).toContain('Retry-After');
  });

  it('no autoriza a un origen que no está en la lista', async () => {
    const api = await startApp();

    const preflight = await api
      .options('/probe/search')
      .set('Origin', OTHER_ORIGIN)
      .set('Access-Control-Request-Method', 'QUERY');
    const simple = await api.get('/probe/ping').set('Origin', OTHER_ORIGIN);

    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
    expect(simple.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('no envía cabeceras CORS si no hay orígenes configurados', async () => {
    const api = await startApp({ corsOrigins: [] });

    const { headers } = await api
      .get('/probe/ping')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(headers['access-control-allow-origin']).toBeUndefined();
    expect(headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('no afecta a quien no es un navegador (apps móviles, curl)', async () => {
    const api = await startApp();

    const { headers } = await api.get('/probe/ping').expect(200);

    expect(headers['access-control-allow-origin']).toBeUndefined();
  });
});
