import { Inject, Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type {
  AuthenticatedSession,
  RequestHeaders,
  SessionResolver,
} from '@/shared/application/ports/session-resolver.port.js';
import type { Auth } from '@/modules/auth/infrastructure/better-auth/auth.factory.js';
import { BETTER_AUTH } from '@/modules/auth/infrastructure/better-auth/auth.token.js';

/**
 * Identifica al usuario de una petición con la cookie de sesión de better-auth.
 *
 * @remarks
 * No renueva la sesión (`disableRefresh`): si lo hiciera aquí, la base de datos alargaría la
 * sesión sin que la app reciba la cookie nueva, y la app la daría por vencida a los 30 días
 * aunque el servidor la siga aceptando. La renovación ocurre en `GET /auth/get-session`, que sí
 * responde con `Set-Cookie`.
 */
@Injectable()
export class BetterAuthSessionResolver implements SessionResolver {
  constructor(@Inject(BETTER_AUTH) private readonly auth: Auth) {}

  /**
   * @param headers - Cabeceras de la petición; de ahí sale la cookie de sesión.
   * @returns La sesión vigente y su persona, o `null` si no hay ninguna.
   * @throws Si la persona no tiene celular. La base de datos lo exige, así que sería un dato
   * corrupto: se falla en voz alta en lugar de autenticar con un celular vacío.
   */
  async resolve(headers: RequestHeaders): Promise<AuthenticatedSession | null> {
    const result = await this.auth.api.getSession({
      headers: fromNodeHeaders(headers),
      query: { disableRefresh: true },
    });
    if (!result) {
      return null;
    }
    const { session, user } = result;
    if (!user.phoneNumber) {
      throw new Error(`La persona ${user.id} no tiene celular.`);
    }
    return {
      id: session.id,
      user: {
        id: user.id,
        phone: user.phoneNumber,
        fullName: user.name,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }
}
