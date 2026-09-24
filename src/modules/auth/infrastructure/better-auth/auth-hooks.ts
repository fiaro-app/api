import { createAuthMiddleware } from 'better-auth/api';
import {
  CHANGE_PASSWORD_PATH,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import {
  hashWhenPhoneIsUnknown,
  isRecord,
  withPasswordChangeCleared,
} from '@/modules/auth/infrastructure/better-auth/auth-hook-rules.js';

/**
 * Reglas de Fiaro sobre las rutas de better-auth; la lógica de cada una está en
 * `auth-hook-rules.ts`.
 *
 * - Iniciar sesión: nivela el tiempo de respuesta entre celulares con y sin cuenta.
 * - Cambiar la contraseña: revoca siempre las demás sesiones (quien conocía la contraseña
 *   anterior, por ejemplo la temporal, pierde el acceso) y, si sale bien, quita la marca de
 *   contraseña temporal.
 */
export const authHooks = {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path === SIGN_IN_PATH) {
      await hashWhenPhoneIsUnknown(
        {
          phoneExists: async (phone) =>
            (await ctx.context.adapter.findOne({
              model: 'user',
              where: [{ field: 'phoneNumber', value: phone }],
            })) !== null,
          hash: (password) => ctx.context.password.hash(password),
        },
        ctx.body,
      );
      return;
    }
    if (ctx.path === CHANGE_PASSWORD_PATH) {
      return {
        context: {
          body: {
            ...(isRecord(ctx.body) ? ctx.body : {}),
            revokeOtherSessions: true,
          },
        },
      };
    }
  }),

  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path !== CHANGE_PASSWORD_PATH) {
      return;
    }
    const newSession = ctx.context.newSession;
    if (!newSession) {
      return;
    }
    await ctx.context.internalAdapter.updateUser(newSession.user.id, {
      mustChangePassword: false,
    });
    const returned = ctx.context.returned;
    if (isRecord(returned)) {
      return ctx.json(withPasswordChangeCleared(returned));
    }
  }),
};
