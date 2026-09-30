import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { LenderScopeResolver } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { LENDER_SCOPE_RESOLVER } from '@/shared/application/ports/lender-scope-resolver.token.js';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { setLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

/**
 * Guard de rutas que operan sobre un Lender: resuelve con cuál, a partir de las membresías
 * activas de la sesión, y lo deja disponible para `@CurrentLenderScope()`.
 *
 * @remarks
 * No es global (a diferencia de `AuthGuard`): solo las rutas que aíslan por `lenderId` lo usan
 * (`@UseGuards(LenderScopeGuard)`), así que siempre corre después de `AuthGuard`, con la sesión
 * ya resuelta. Si la persona no tiene ninguna membresía `ACTIVE`, responde 403 `FORBIDDEN`. Si
 * tiene más de una (trabaja para varios prestamistas), por ahora usa la más antigua: el producto
 * todavía no define cómo elegir entre varias en una misma sesión (PRODUCT.md §10 solo describe el
 * selector Admin/Cobrador, que es de rol dentro de un mismo Lender, no de cuál Lender).
 */
@Injectable()
export class LenderScopeGuard implements CanActivate {
  constructor(
    @Inject(LENDER_SCOPE_RESOLVER)
    private readonly resolver: LenderScopeResolver,
  ) {}

  /**
   * @param context - Contexto de la petición que se evalúa.
   * @returns `true` si la sesión tiene una membresía activa con la que operar.
   * @throws {@link ForbiddenException} Sin ninguna membresía activa (`FORBIDDEN`).
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const session = getAuthenticatedSession(request);
    if (!session) {
      throw new Error(
        'LenderScopeGuard se usó en una ruta sin AuthGuard: agrégalo primero o quita @Public().',
      );
    }

    const scope = await this.resolver.resolve(session.user.id);
    if (!scope) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }

    setLenderScope(request, scope);
    return true;
  }
}
