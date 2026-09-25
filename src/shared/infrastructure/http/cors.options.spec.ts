import { HttpMethodSchema } from '@fiaro-app/contracts';
import { describe, expect, it } from 'vitest';
import { API_VERSION_HEADER } from '@/shared/infrastructure/http/api-versioning.js';
import {
  CORS_METHODS,
  buildCorsOptions,
} from '@/shared/infrastructure/http/cors.options.js';

describe('buildCorsOptions', () => {
  const origins = ['https://app.fiaro.co', 'http://localhost:3001'];

  it('permite QUERY y ningún método que la API no use', () => {
    const { methods } = buildCorsOptions(origins);

    expect(methods).toEqual([...CORS_METHODS]);
    expect(methods).toContain('QUERY');
    expect(methods).not.toContain('PUT');
  });

  it('permite todos los métodos que declara el contrato', () => {
    expect(CORS_METHODS).toEqual(
      expect.arrayContaining(HttpMethodSchema.options),
    );
  });

  it('usa solo los orígenes configurados, nunca un comodín', () => {
    const { origin } = buildCorsOptions(origins);

    expect(origin).toEqual(origins);
    expect(origin).not.toContain('*');
  });

  it('no comparte la lista de orígenes con quien la configuró', () => {
    const configured = [...origins];
    const { origin } = buildCorsOptions(configured);

    configured.push('https://otro-sitio.example');

    expect(origin).toEqual(origins);
  });

  it('permite enviar la cabecera de versión', () => {
    const { allowedHeaders } = buildCorsOptions(origins);

    expect(allowedHeaders).toContain(API_VERSION_HEADER);
  });

  it('permite la cookie de sesión y expone las cabeceras de reintento', () => {
    const options = buildCorsOptions(origins);

    expect(options.credentials).toBe(true);
    expect(options.exposedHeaders).toContain('Retry-After');
  });
});
