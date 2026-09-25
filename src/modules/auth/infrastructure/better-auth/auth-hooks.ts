import { createAuthMiddleware } from 'better-auth/api';
import {
  CHANGE_PASSWORD_PATH,
  SIGN_IN_PATH,
} from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import type { AuthAuditor } from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import {
  type AuthHookContext,
  failureCodeOf,
  newSessionOf,
  originOf,
  phoneOf,
  requesterOf,
} from '@/modules/auth/infrastructure/better-auth/auth-audit-rules.js';
import {
  hashWhenPhoneIsUnknown,
  isRecord,
  withPasswordChangeCleared,
} from '@/modules/auth/infrastructure/better-auth/auth-hook-rules.js';

/** Audita cómo terminó un inicio de sesión: la sesión que abrió, o el código con que lo rechazó. */
function auditSignIn(auditor: AuthAuditor, ctx: AuthHookContext): void {
  const origin = originOf(ctx);
  const opened = newSessionOf(ctx);
  if (opened) {
    auditor.signedIn(opened.person, opened.mustChangePassword, origin);
    return;
  }
  const code = failureCodeOf(ctx);
  if (code !== undefined) {
    auditor.signInFailed(phoneOf(ctx), code, origin);
  }
}

/** Audita cómo terminó un cambio de contraseña: quién lo hizo, o el código con que lo rechazó. */
function auditPasswordChange(auditor: AuthAuditor, ctx: AuthHookContext): void {
  const origin = originOf(ctx);
  const code = failureCodeOf(ctx);
  if (code !== undefined) {
    auditor.passwordChangeFailed(requesterOf(ctx), code, origin);
    return;
  }
  const opened = newSessionOf(ctx);
  if (opened) {
    auditor.passwordChanged(opened.person, origin);
  }
}

/** Lo que corre antes de la ruta: nivela el tiempo del inicio de sesión y fuerza revocar las demás sesiones. */
function createBeforeHook() {
  return createAuthMiddleware(async (ctx) => {
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
  });
}

/** Lo que corre después de la ruta: audita el resultado y, al cambiar la contraseña, quita la marca de temporal. */
function createAfterHook(auditor: AuthAuditor) {
  return createAuthMiddleware(async (ctx) => {
    if (ctx.path === SIGN_IN_PATH) {
      auditSignIn(auditor, ctx);
      return;
    }
    if (ctx.path !== CHANGE_PASSWORD_PATH) {
      return;
    }
    auditPasswordChange(auditor, ctx);
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
  });
}

/**
 * Reglas de Fiaro sobre las rutas de better-auth; la lógica de cada una está en
 * `auth-hook-rules.ts` y la de la auditoría en `auth-audit-rules.ts`.
 *
 * - Iniciar sesión: nivela el tiempo de respuesta entre celulares con y sin cuenta y audita el
 *   resultado (`auth.sign_in.succeeded` o `auth.sign_in.failed`).
 * - Cambiar la contraseña: revoca siempre las demás sesiones (quien conocía la contraseña
 *   anterior, por ejemplo la temporal, pierde el acceso), audita el resultado y, si sale bien,
 *   quita la marca de contraseña temporal.
 *
 * Cerrar sesión se audita en {@link createAuthDatabaseHooks}, porque esa ruta no sabe quién era.
 *
 * @param auditor - A quien se le avisa de cada resultado.
 */
export function createAuthHooks(auditor: AuthAuditor) {
  return { before: createBeforeHook(), after: createAfterHook(auditor) };
}
