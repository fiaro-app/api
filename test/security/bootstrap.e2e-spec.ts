import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module.js';
import { useSecurityApp } from '@test/support/security-app.js';

const startApp = useSecurityApp();

describe('cabeceras de seguridad', () => {
  it('las rutas de la API responden con la política estricta', async () => {
    const api = await startApp();

    const { headers } = await api.get('/probe/ping').expect(200);

    expect(headers['content-security-policy']).toBe(
      "default-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'",
    );
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('la documentación tiene su propia política, más abierta', async () => {
    const api = await startApp();

    const { headers } = await api.get('/docs').expect(200);

    expect(headers['content-security-policy']).toContain("script-src 'self'");
    expect(headers['content-security-policy']).not.toContain(
      "default-src 'none'",
    );
  });
});

describe('cookies', () => {
  it('lee las cookies de la petición en req.cookies', async () => {
    const api = await startApp();

    const { body } = await api
      .get('/probe/cookies')
      .set('Cookie', 'session=abc123; theme=dark')
      .expect(200);

    expect(body).toEqual({ session: 'abc123', theme: 'dark' });
  });
});

describe('arranque', () => {
  it('no arranca con una variable de entorno inválida', async () => {
    vi.stubEnv('PORT', 'abc');

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow(/PORT/);
  });
});
