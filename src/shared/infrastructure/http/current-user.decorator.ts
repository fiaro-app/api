import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';

/**
 * Extrae la persona autenticada de la petición; es lo que ejecuta `@CurrentUser()`.
 *
 * @param _data - Argumento del decorador (no se usa).
 * @param context - Contexto de la petición.
 * @throws Un error de programación (500) si la ruta es `@Public()`: ahí no hay sesión.
 */
export function currentUserFromContext(
  _data: unknown,
  context: ExecutionContext,
): AuthenticatedUser {
  const session = getAuthenticatedSession(
    context.switchToHttp().getRequest<Request>(),
  );
  if (!session) {
    throw new Error(
      '@CurrentUser() se usó en una ruta sin sesión. Quita @Public() de la ruta o no pidas el usuario.',
    );
  }
  return session.user;
}

/** La persona que hace la petición, tal como la identificó `AuthGuard`. */
export const CurrentUser = createParamDecorator(currentUserFromContext);
