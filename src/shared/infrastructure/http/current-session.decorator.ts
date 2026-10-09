import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedSession } from '@/shared/application/ports/session-resolver.port.js';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';

/**
 * Extrae la sesión autenticada de la petición; es lo que ejecuta `@CurrentSession()`.
 *
 * @param _data - Argumento del decorador (no se usa).
 * @param context - Contexto de la petición.
 * @throws Un error de programación (500) si la ruta es `@Public()`: ahí no hay sesión.
 */
export function currentSessionFromContext(
  _data: unknown,
  context: ExecutionContext,
): AuthenticatedSession {
  const session = getAuthenticatedSession(
    context.switchToHttp().getRequest<Request>(),
  );
  if (!session) {
    throw new Error(
      '@CurrentSession() se usó en una ruta sin sesión. Quita @Public() de la ruta o no pidas la sesión.',
    );
  }
  return session;
}

/** La sesión desde la que se hace la petición (su id y su persona), tal como la identificó `AuthGuard`. */
export const CurrentSession = createParamDecorator(currentSessionFromContext);
