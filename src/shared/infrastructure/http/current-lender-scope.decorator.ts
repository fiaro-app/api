import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { getLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

/**
 * Extrae el alcance de la petición; es lo que ejecuta `@CurrentLenderScope()`.
 *
 * @param _data - Argumento del decorador (no se usa).
 * @param context - Contexto de la petición.
 * @throws Un error de programación (500) si la ruta no usa `LenderScopeGuard`.
 */
export function currentLenderScopeFromContext(
  _data: unknown,
  context: ExecutionContext,
): LenderScope {
  const scope = getLenderScope(context.switchToHttp().getRequest<Request>());
  if (!scope) {
    throw new Error(
      '@CurrentLenderScope() se usó en una ruta sin LenderScopeGuard. Agrégalo con @UseGuards(LenderScopeGuard).',
    );
  }
  return scope;
}

/** El Lender con el que opera la sesión, tal como lo identificó `LenderScopeGuard`. */
export const CurrentLenderScope = createParamDecorator(
  currentLenderScopeFromContext,
);
