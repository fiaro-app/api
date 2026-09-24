import type { Request } from 'express';
import type { AuthenticatedSession } from '@/shared/application/ports/session-resolver.port.js';

const AUTHENTICATED_SESSION = Symbol('fiaro:authenticated-session');

type RequestWithSession = Request & {
  [AUTHENTICATED_SESSION]?: AuthenticatedSession;
};

/**
 * Guarda la sesión identificada en la petición, para `@CurrentUser()` y los demás guards.
 *
 * @param request - Petición de Express.
 * @param session - Sesión que identificó `AuthGuard`.
 */
export function setAuthenticatedSession(
  request: Request,
  session: AuthenticatedSession,
): void {
  (request as RequestWithSession)[AUTHENTICATED_SESSION] = session;
}

/**
 * La sesión que identificó `AuthGuard`, o `undefined` en una ruta pública.
 *
 * @param request - Petición de Express.
 */
export function getAuthenticatedSession(
  request: Request,
): AuthenticatedSession | undefined {
  return (request as RequestWithSession)[AUTHENTICATED_SESSION];
}
