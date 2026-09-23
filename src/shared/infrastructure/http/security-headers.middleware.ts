import type { RequestHandler } from 'express';
import helmet from 'helmet';

function isDocsRequest(path: string, docsPath: string): boolean {
  const base = `/${docsPath}`;
  return path === base || path.startsWith(`${base}/`);
}

/**
 * Cabeceras de seguridad (Helmet) con dos políticas de contenido: la estricta de la API
 * (`default-src 'none'`) y la de la interfaz de documentación bajo `docsPath`, que Swagger UI
 * necesita más abierta.
 *
 * @param docsPath - Ruta de la documentación, sin `/` inicial.
 */
export function createSecurityHeaders(docsPath: string): RequestHandler {
  const forApi = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });
  const forDocs = helmet({
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
  });

  return (req, res, next) => {
    (isDocsRequest(req.path, docsPath) ? forDocs : forApi)(req, res, next);
  };
}
