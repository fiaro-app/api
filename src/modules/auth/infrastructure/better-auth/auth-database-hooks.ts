import type { BetterAuthOptions } from 'better-auth';
import {
  REVOKE_OTHER_SESSIONS_PATH,
  REVOKE_SESSIONS_PATH,
  SIGN_OUT_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type {
  AuthAuditor,
  RevocationScope,
} from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { originOf } from '@/modules/auth/infrastructure/better-auth/auth-audit-rules.js';

/** Qué sesiones cierra cada ruta de revocar, para el evento de auditoría. */
const REVOCATION_SCOPES: Readonly<Partial<Record<string, RevocationScope>>> = {
  [REVOKE_OTHER_SESSIONS_PATH]: 'others',
  [REVOKE_SESSIONS_PATH]: 'all',
};

/**
 * Hooks sobre las filas de better-auth. Cerrar sesión borra la fila de la sesión, y ese borrado
 * es lo que audita `auth.sign_out`: la ruta de cerrar sesión no dice quién era la persona, la fila
 * sí. Solo cuenta el borrado que pide la persona en esa ruta; las sesiones que revoca un cambio de
 * contraseña o que vencen no son un cierre de sesión. Las rutas de revocar (las demás sesiones o
 * todas) borran una fila por cada sesión que cierran, y cada borrado es un `auth.session.revoked`.
 *
 * @param auditor - A quien se le avisa.
 */
export function createAuthDatabaseHooks(
  auditor: AuthAuditor,
): NonNullable<BetterAuthOptions['databaseHooks']> {
  return {
    session: {
      delete: {
        after: (session, ctx) => {
          if (ctx === null) {
            return Promise.resolve();
          }
          if (ctx.path === SIGN_OUT_PATH) {
            auditor.signedOut(session.userId, originOf(ctx));
          }
          const scope = REVOCATION_SCOPES[ctx.path];
          if (scope !== undefined) {
            auditor.sessionRevoked(session.userId, scope, originOf(ctx));
          }
          return Promise.resolve();
        },
      },
    },
  };
}
