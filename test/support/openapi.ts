import { afterEach, expect } from 'vitest';
import { startTestApp, type TestApp } from '@test/support/test-app.js';

/** Lo que Swagger publica de las rutas de autenticación en `/docs/openapi.json`. */
export interface OpenApiOperation {
  tags: string[];
  summary: string;
  description: string;
  security?: Record<string, string[]>[];
  requestBody?: {
    content: { 'application/json': { schema: Record<string, unknown> } };
  };
  responses: Record<
    string,
    { description: string; headers?: Record<string, unknown> }
  >;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; description: string };
  tags: { name: string; description: string }[];
  paths: Record<string, Partial<Record<'get' | 'post', OpenApiOperation>>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, Record<string, unknown>>;
  };
}

/**
 * Prepara la lectura de `/docs/openapi.json` de la aplicación de prueba y la cierra al terminar
 * cada prueba. Se llama una vez por archivo, fuera de las pruebas.
 *
 * @returns Una función que levanta la aplicación y devuelve el documento OpenAPI que publica.
 */
export function useOpenApi() {
  let running: TestApp | undefined;

  afterEach(async () => {
    await running?.close();
    running = undefined;
  });

  return async (): Promise<OpenApiDocument> => {
    running = await startTestApp({ env: { SWAGGER_ENABLED: 'true' } });
    const response = await running.http.get('/docs/openapi.json');
    expect(response.status).toBe(200);
    return response.body as OpenApiDocument;
  };
}

/**
 * La operación de una ruta en el documento.
 *
 * @throws Si el documento no describe esa ruta con ese método.
 */
export const operation = (
  doc: OpenApiDocument,
  path: string,
  method: 'get' | 'post',
): OpenApiOperation => {
  const found = doc.paths[path]?.[method];
  if (!found) {
    throw new Error(
      `La documentación no describe ${method.toUpperCase()} ${path}`,
    );
  }
  return found;
};
