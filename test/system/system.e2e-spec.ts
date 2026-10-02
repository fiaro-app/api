import { describe, expect, it } from 'vitest';
import { startTestApp } from '@test/support/test-app.js';

describe('GET /health', () => {
  it('responde ok con la versión desplegada, sin sesión', async () => {
    const app = await startTestApp();

    const response = await app.http.get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    });

    await app.close();
  });

  it('responde 503 MAINTENANCE mientras dure la ventana de mantenimiento', async () => {
    const app = await startTestApp({ overrides: { maintenanceMode: true } });

    const response = await app.http.get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ code: 'MAINTENANCE' });

    await app.close();
  });
});

describe('GET /mobile/version', () => {
  it('responde la configuración del version-gate, sin sesión', async () => {
    const app = await startTestApp({
      overrides: {
        mobile: {
          minimumSupportedVersion: '1.2.0',
          latestVersion: '1.4.1',
          downloadUrl: 'https://fiaro.co/app.apk',
        },
      },
    });

    const response = await app.http.get('/mobile/version');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      minimumSupportedVersion: '1.2.0',
      latestVersion: '1.4.1',
      downloadUrl: 'https://fiaro.co/app.apk',
    });

    await app.close();
  });
});
