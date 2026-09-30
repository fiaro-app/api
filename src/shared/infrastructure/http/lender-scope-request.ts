import type { Request } from 'express';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';

const LENDER_SCOPE = Symbol('fiaro:lender-scope');

type RequestWithLenderScope = Request & {
  [LENDER_SCOPE]?: LenderScope;
};

/**
 * Guarda el alcance identificado en la petición, para `@CurrentLenderScope()`.
 *
 * @param request - Petición de Express.
 * @param scope - Alcance que identificó `LenderScopeGuard`.
 */
export function setLenderScope(request: Request, scope: LenderScope): void {
  (request as RequestWithLenderScope)[LENDER_SCOPE] = scope;
}

/**
 * El alcance que identificó `LenderScopeGuard`, o `undefined` en una ruta que no usa ese guard.
 *
 * @param request - Petición de Express.
 */
export function getLenderScope(request: Request): LenderScope | undefined {
  return (request as RequestWithLenderScope)[LENDER_SCOPE];
}
