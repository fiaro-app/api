import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { CollectorAccess } from '@/shared/application/ports/collector-access.port.js';
import { COLLECTOR_ACCESS } from '@/shared/application/ports/collector-access.token.js';
import { isCollectorOnly } from '@/shared/application/security/is-collector-only.js';
import { getLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

/** Qué recurso del parámetro de la ruta se le restringe a un cobrador. */
export type CollectorRestriction = 'loan' | 'client';

/** Clave del metadato que deja `@RestrictCollectorTo`. */
export const COLLECTOR_RESTRICTION = 'fiaro:collector-restriction';

/**
 * Cierra el paso a un cobrador que no administra cuando pide un préstamo o un cliente que no tiene
 * asignado. Responde `404 NOT_FOUND`, igual que un id de otro prestamista: no revela que existe.
 *
 * @remarks
 * Corre después de `LenderScopeGuard` (el del controller), que es quien deja el alcance en la
 * petición. Quien administra (`OWNER`/`LENDER`) pasa sin consultar nada.
 */
@Injectable()
export class CollectorAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(COLLECTOR_ACCESS) private readonly access: CollectorAccess,
  ) {}

  /**
   * @param context - Contexto de la petición; su handler lleva `@RestrictCollectorTo`.
   * @throws {@link NotFoundException} Si es un cobrador sin acceso a ese recurso.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const kind = this.reflector.get<CollectorRestriction | undefined>(
      COLLECTOR_RESTRICTION,
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest<Request>();
    const scope = getLenderScope(request);
    if (kind === undefined || scope === undefined) {
      throw new Error(
        'CollectorAccessGuard necesita @RestrictCollectorTo y LenderScopeGuard antes en el controller.',
      );
    }
    if (!isCollectorOnly(scope.roles)) {
      return true;
    }
    const id = request.params.loanId ?? request.params.id;
    const allowed =
      typeof id === 'string' &&
      (kind === 'loan'
        ? await this.access.canAccessLoan(scope.membershipId, id)
        : await this.access.canAccessClient(scope.membershipId, id));
    if (!allowed) {
      throw new NotFoundException({ code: ErrorCodeSchema.enum.NOT_FOUND });
    }
    return true;
  }
}
