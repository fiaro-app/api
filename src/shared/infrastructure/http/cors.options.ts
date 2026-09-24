import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import { API_VERSION_HEADER } from '@/shared/infrastructure/http/api-versioning.js';

/**
 * Métodos permitidos desde un navegador. `QUERY` va incluido: no es un método simple y el
 * navegador lo bloquea en el preflight si el servidor no lo declara.
 */
export const CORS_METHODS = [
  'GET',
  'HEAD',
  'QUERY',
  'POST',
  'PATCH',
  'DELETE',
] as const;

/**
 * Política CORS: solo los `origins` indicados pueden llamar a la API desde un navegador, con
 * cookies de sesión.
 *
 * @param origins - Orígenes exactos permitidos; nunca `*`, porque `credentials` está activo.
 */
export function buildCorsOptions(origins: readonly string[]): CorsOptions {
  return {
    origin: [...origins],
    methods: [...CORS_METHODS],
    allowedHeaders: ['Content-Type', 'Authorization', API_VERSION_HEADER],
    exposedHeaders: [
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 600,
  };
}
