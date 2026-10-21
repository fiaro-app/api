import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { LenderScopeResolver } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { LENDER_SCOPE_RESOLVER } from '@/shared/application/ports/lender-scope-resolver.token.js';
import type { SubscriptionAccess } from '@/shared/application/ports/subscription-access.port.js';
import { SUBSCRIPTION_ACCESS } from '@/shared/application/ports/subscription-access.token.js';
import type { PlanFeature } from '@/shared/domain/subscriptions/plan-features.js';
import { REQUIRED_PLAN_FEATURE } from '@/shared/infrastructure/http/requires-plan-feature.decorator.js';
import { ALLOW_WHEN_READ_ONLY } from '@/shared/infrastructure/http/allow-when-read-only.decorator.js';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { setLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

/** Métodos que modifican datos; las lecturas (`GET`, `QUERY`) nunca se bloquean. */
const WRITE_METHODS: ReadonlySet<string> = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

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
 *
 * También aplica el solo lectura (PRODUCT.md §7, D-148): con la suscripción vencida más allá de la
 * gracia, las rutas de escritura responden 403 `SUBSCRIPTION_READ_ONLY`, salvo las marcadas con
 * `@AllowWhenReadOnly()` (visitas, pagos y cuadres). Y las funciones propias de un plan (D-151): una
 * ruta marcada con `@RequiresPlanFeature()` responde 403 `PLAN_FEATURE_UNAVAILABLE` a quien no la trae.
 */
@Injectable()
export class LenderScopeGuard implements CanActivate {
  constructor(
    @Inject(LENDER_SCOPE_RESOLVER)
    private readonly resolver: LenderScopeResolver,
    @Inject(SUBSCRIPTION_ACCESS)
    private readonly subscription: SubscriptionAccess,
    private readonly reflector: Reflector,
  ) {}

  /**
   * @param context - Contexto de la petición que se evalúa.
   * @returns `true` si la sesión tiene una membresía activa con la que operar.
   * @throws {@link ForbiddenException} Sin ninguna membresía activa (`FORBIDDEN`), o con la
   * suscripción en solo lectura en una ruta de escritura (`SUBSCRIPTION_READ_ONLY`).
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

    await this.assertPlanAllows(request, context, scope.lenderId);

    setLenderScope(request, scope);
    return true;
  }

  /**
   * Lo que el plan del negocio permite en esta ruta: la función que exige (`@RequiresPlanFeature`) y,
   * si escribe, que no esté en solo lectura (a menos que sea `@AllowWhenReadOnly()`). Solo consulta el
   * plan cuando la ruta lo necesita.
   *
   * @throws {@link ForbiddenException} `PLAN_FEATURE_UNAVAILABLE` o `SUBSCRIPTION_READ_ONLY`.
   */
  private async assertPlanAllows(
    request: Request,
    context: ExecutionContext,
    lenderId: string,
  ): Promise<void> {
    const handler = context.getHandler();
    const feature = this.reflector.get<PlanFeature | undefined>(
      REQUIRED_PLAN_FEATURE,
      handler,
    );
    if (feature && !(await this.subscription.hasFeature(lenderId, feature))) {
      throw new ForbiddenException({ code: 'PLAN_FEATURE_UNAVAILABLE' });
    }
    const writes =
      WRITE_METHODS.has(request.method) &&
      !this.reflector.get<boolean | undefined>(ALLOW_WHEN_READ_ONLY, handler);
    if (writes && (await this.subscription.isReadOnly(lenderId))) {
      throw new ForbiddenException({
        code: ErrorCodeSchema.enum.SUBSCRIPTION_READ_ONLY,
      });
    }
  }
}
