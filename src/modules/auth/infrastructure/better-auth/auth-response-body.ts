import { isRecord } from '@/modules/auth/infrastructure/better-auth/auth-hook-rules.js';

const withoutToken = (
  record: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'token'));

/**
 * Quita el token de sesión de un cuerpo de better-auth.
 *
 * @remarks
 * Iniciar sesión y cambiar la contraseña lo traen en `token`, y ver la sesión en `session.token`.
 * Es el mismo valor que viaja firmado en la cookie `HttpOnly`, a la que el JavaScript de una
 * página no llega. En el cuerpo sí llegaría: un script inyectado (XSS) que llamara a
 * `GET /auth/get-session` lo leería y la cookie dejaría de proteger la sesión. Por eso el token
 * solo sale por `Set-Cookie`.
 *
 * @param body - Cuerpo ya interpretado como JSON.
 * @returns Una copia sin el token; el mismo valor si no es un objeto (por ejemplo, `null` cuando
 * no hay sesión).
 */
export function withoutSessionToken(body: unknown): unknown {
  if (!isRecord(body) || Array.isArray(body)) {
    return body;
  }
  const clean = withoutToken(body);
  return isRecord(clean.session)
    ? { ...clean, session: withoutToken(clean.session) }
    : clean;
}
