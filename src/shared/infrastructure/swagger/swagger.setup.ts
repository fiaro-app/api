import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_VERSION_HEADER } from '@/shared/infrastructure/http/api-versioning.js';
import {
  SESSION_COOKIE_NAME,
  SESSION_SECURITY_SCHEME,
} from '@/shared/infrastructure/http/session-cookie.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Ruta de la interfaz de documentación; el resto de la documentación cuelga de ella. */
export const DOCS_PATH = 'docs';

/**
 * Publica la documentación OpenAPI: interfaz en `/docs` y documento JSON en `/docs/openapi.json`,
 * generados con las rutas y los schemas de Zod de cada ruta.
 *
 * @remarks
 * Declara OpenAPI 3.2, la primera versión con la operación `query` (método QUERY); con la 3.0 que
 * usa Nest por defecto, Swagger UI oculta esas rutas. Declara además la cookie de sesión como
 * esquema de seguridad (las rutas protegidas la marcan con `@ApiCookieAuth()`) y los grupos de
 * {@link API_TAGS}.
 *
 * @param app - Aplicación cuyas rutas se documentan.
 * @param apiVersion - Versión por defecto de la API; se muestra como versión del documento.
 */
export function setupSwagger(app: INestApplication, apiVersion: string): void {
  const builder = new DocumentBuilder()
    .setTitle('Fiaro API')
    .setDescription(
      [
        'API del sistema de control de cartera de Fiaro.',
        `La versión se elige con la cabecera \`${API_VERSION_HEADER}\`; sin ella se sirve la versión ${apiVersion}.`,
        'Toda ruta exige una sesión salvo las públicas. Sin sesión responde 401 `UNAUTHENTICATED`; con una contraseña temporal, 403 `PASSWORD_CHANGE_REQUIRED`; al pasarse del rate limit, 429 `RATE_LIMITED` con `Retry-After`. Los errores llevan un `code` estable: las apps reaccionan a él, no al texto del mensaje.',
      ].join('\n\n'),
    )
    .setVersion(apiVersion)
    .setOpenAPIVersion('3.2.0')
    .addCookieAuth(
      SESSION_COOKIE_NAME,
      {
        type: 'apiKey',
        in: 'cookie',
        name: SESSION_COOKIE_NAME,
        description:
          'Cookie de sesión que entrega `POST /auth/sign-in/phone-number`. Swagger UI no la envía por sí solo: inicia sesión desde otra herramienta (Postman, curl) o pega el valor aquí.',
      },
      SESSION_SECURITY_SCHEME,
    );
  for (const tag of Object.values(API_TAGS)) {
    builder.addTag(tag.name, tag.description);
  }
  const config = builder.build();

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
