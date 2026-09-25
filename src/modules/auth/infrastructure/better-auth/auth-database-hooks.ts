import type { BetterAuthOptions } from 'better-auth';
import { SIGN_OUT_PATH } from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { originOf } from '@/modules/auth/infrastructure/better-auth/auth-audit-rules.js';

/**
 * Hooks sobre las filas de better-auth. Cerrar sesión borra la fila de la sesión, y ese borrado
 * es lo que audita `auth.sign_out`: la ruta de cerrar sesión no dice quién era la persona, la fila
 * sí. Solo cuenta el borrado que pide la persona en esa ruta; las sesiones que revoca un cambio de
 * contraseña o que vencen no son un cierre de sesión.
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
          if (ctx?.path === SIGN_OUT_PATH) {
            auditor.signedOut(session.userId, originOf(ctx));
          }
          return Promise.resolve();
        },
      },
    },
  };
}
