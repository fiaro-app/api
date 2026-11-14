import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { getAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';

/**
 * Deja pasar solo a quien opera la plataforma (D-156): los celulares de `PLATFORM_ADMIN_PHONES`. No es un
 * rol de negocio (esos viven en la membresía): es quien administra Fiaro, para lo que cruza negocios, como
 * devolver el pago de un plan. Corre después de `AuthGuard`; con la lista vacía nadie pasa.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  /**
   * @param context - Contexto de la petición que se evalúa.
   * @throws {@link ForbiddenException} `FORBIDDEN`, si el celular de la sesión no está en la lista.
   */
  canActivate(context: ExecutionContext): boolean {
    const session = getAuthenticatedSession(
      context.switchToHttp().getRequest<Request>(),
    );
    if (!session) {
      throw new Error(
        'PlatformAdminGuard se usó en una ruta sin AuthGuard: agrégalo primero o quita @Public().',
      );
    }
    if (!this.env.platformAdminPhones.includes(session.user.phone)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return true;
  }
}
