import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { SessionResolver } from '@/shared/application/ports/session-resolver.port.js';
import { SESSION_RESOLVER } from '@/shared/application/ports/session-resolver.token.js';
import { setAuthenticatedSession } from '@/shared/infrastructure/http/authenticated-request.js';
import { IS_PUBLIC_KEY } from '@/shared/infrastructure/http/public.decorator.js';

/**
 * Guard global de autenticación: toda ruta exige una sesión vigente salvo las marcadas con
 * `@Public()`.
 *
 * @remarks
 * Con una contraseña temporal (`mustChangePassword`) la sesión existe pero no sirve para operar:
 * responde 403 `PASSWORD_CHANGE_REQUIRED` hasta que la persona la cambie por `/auth/change-password`.
 * Así quien conozca la contraseña temporal (por ejemplo, quien la envió por WhatsApp) no puede usarla.
 * Corre después del rate limit, así que un ataque de fuerza bruta no llega a consultar la base de datos.
 * Las excepciones solo llevan el `code`: el filtro global escribe el mensaje en el idioma de la
 * petición.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SESSION_RESOLVER) private readonly sessions: SessionResolver,
  ) {}

  /**
   * @param context - Contexto de la petición que se evalúa.
   * @returns `true` si la ruta es pública o la petición trae una sesión vigente.
   * @throws {@link UnauthorizedException} Sin sesión vigente (`UNAUTHENTICATED`).
   * @throws {@link ForbiddenException} Con contraseña temporal sin cambiar (`PASSWORD_CHANGE_REQUIRED`).
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.sessions.resolve(request.headers);
    if (!session) {
      throw new UnauthorizedException({
        code: ErrorCodeSchema.enum.UNAUTHENTICATED,
      });
    }
    if (session.user.mustChangePassword) {
      throw new ForbiddenException({
        code: ErrorCodeSchema.enum.PASSWORD_CHANGE_REQUIRED,
      });
    }

    setAuthenticatedSession(request, session);
    return true;
  }
}
