import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_VERSION_HEADER } from '../http/api-versioning.js';

/** Ruta de la interfaz de documentación; el resto de la documentación cuelga de ella. */
export const DOCS_PATH = 'docs';

/**
 * Publica la documentación OpenAPI: interfaz en `/docs` y documento JSON en `/docs/openapi.json`,
 * generados con las rutas y los schemas de Zod de `@Body({ schema })`.
 *
 * @remarks
 * Declara OpenAPI 3.2, la primera versión con la operación `query` (método QUERY); con la 3.0 que
 * usa Nest por defecto, Swagger UI oculta esas rutas.
 *
 * @param apiVersion - Versión por defecto de la API; se muestra como versión del documento.
 */
export function setupSwagger(app: INestApplication, apiVersion: string): void {
  const config = new DocumentBuilder()
    .setTitle('Fiaro API')
    .setDescription(
      `API del sistema de control de cartera de Fiaro.\n\nLa versión se elige con la cabecera \`${API_VERSION_HEADER}\`; sin ella se sirve la versión ${apiVersion}.`,
    )
    .setVersion(apiVersion)
    .setOpenAPIVersion('3.2.0')
    .build();

  SwaggerModule.setup(
    DOCS_PATH,
    app,
    () => SwaggerModule.createDocument(app, config),
    {
      raw: ['json'],
      jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
      customSiteTitle: 'Fiaro API',
    },
  );
}
