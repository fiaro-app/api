import { APIError } from 'better-auth/api';
import type {
  AuditedPerson,
  RequestOrigin,
} from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import { CLIENT_IP_HEADER } from '@/modules/auth/infrastructure/better-auth/auth.constants.js';
import { isRecord } from '@/modules/auth/infrastructure/better-auth/auth-hook-rules.js';

/**
 * Lo que los hooks de auditoría leen del contexto de better-auth. Todo es `unknown` a propósito:
 * el contexto real cambia de forma según la ruta y aquí se lee con comprobaciones, no con casts.
 */
export interface AuthHookContext {
  readonly body?: unknown;
  readonly request?: unknown;
  readonly context?: unknown;
}

const stringField = (source: unknown, name: string): string | undefined => {
  if (!isRecord(source)) {
    return undefined;
  }
  const value = source[name];
  return typeof value === 'string' ? value : undefined;
};

/**
 * De dónde llegó la petición: la IP que escribió el controller y el navegador o la app.
 *
 * @param ctx - Contexto del hook.
 */
export function originOf(ctx: AuthHookContext): RequestOrigin {
  const headers = isRecord(ctx.request) ? ctx.request.headers : undefined;
  if (!(headers instanceof Headers)) {
    return {};
  }
  return {
    ip: headers.get(CLIENT_IP_HEADER) ?? undefined,
    userAgent: headers.get('user-agent') ?? undefined,
  };
}

/**
 * El celular que trae el cuerpo de la petición, si lo trae.
 *
 * @param ctx - Contexto del hook.
 */
export function phoneOf(ctx: AuthHookContext): string | undefined {
  return stringField(ctx.body, 'phoneNumber');
}

/**
 * El código con el que la ruta rechazó la petición, o `undefined` si salió bien.
 *
 * @param ctx - Contexto del hook, con lo que devolvió la ruta.
 */
export function failureCodeOf(ctx: AuthHookContext): string | undefined {
  const returned = isRecord(ctx.context) ? ctx.context.returned : undefined;
  if (!(returned instanceof APIError)) {
    return undefined;
  }
  return stringField(returned.body, 'code') ?? String(returned.status);
}

/** La persona de un objeto `{ id, phoneNumber }` de better-auth. */
function personOf(user: unknown): AuditedPerson | undefined {
  const id = stringField(user, 'id');
  return id === undefined
    ? undefined
    : { id, phone: stringField(user, 'phoneNumber') };
}

/**
 * La persona de la sesión que la ruta acaba de abrir, con la marca de contraseña temporal.
 *
 * @param ctx - Contexto del hook.
 */
export function newSessionOf(
  ctx: AuthHookContext,
): { person: AuditedPerson; mustChangePassword: boolean } | undefined {
  const session = isRecord(ctx.context) ? ctx.context.newSession : undefined;
  const user = isRecord(session) ? session.user : undefined;
  const person = personOf(user);
  return person === undefined
    ? undefined
    : {
        person,
        mustChangePassword: isRecord(user) && user.mustChangePassword === true,
      };
}

/**
 * La persona de la sesión con la que se pidió la ruta (la de la cookie).
 *
 * @param ctx - Contexto del hook.
 */
export function requesterOf(ctx: AuthHookContext): AuditedPerson | undefined {
  const session = isRecord(ctx.context) ? ctx.context.session : undefined;
  return personOf(isRecord(session) ? session.user : undefined);
}
