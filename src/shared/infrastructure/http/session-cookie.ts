/** Prefijo de las cookies de better-auth: distingue las de Fiaro de las de otros servicios del mismo dominio. */
export const SESSION_COOKIE_PREFIX = 'fiaro';

/**
 * Nombre de la cookie que identifica la sesión. En producción, con HTTPS, better-auth le antepone
 * `__Secure-`: el navegador solo la acepta si el sitio usa HTTPS.
 */
export const SESSION_COOKIE_NAME = `${SESSION_COOKIE_PREFIX}.session_token`;

/** Nombre con el que la documentación OpenAPI declara la cookie de sesión como esquema de seguridad. */
export const SESSION_SECURITY_SCHEME = 'sessionCookie';
