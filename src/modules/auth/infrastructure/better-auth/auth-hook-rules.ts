/**
 * Indica si un valor es un objeto (no `null`): lo que puede tener propiedades.
 *
 * @param value - Valor a revisar.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Lo que hace falta para nivelar el tiempo de respuesta de un inicio de sesión. */
export interface UnknownPhoneTiming {
  /** Si el celular ya tiene cuenta. */
  phoneExists(phone: string): Promise<boolean>;
  /** Calcula el hash de una contraseña con el algoritmo de better-auth. */
  hash(password: string): Promise<string>;
}

/**
 * Hace que iniciar sesión con un celular sin cuenta tarde lo mismo que con uno que sí la tiene.
 *
 * @remarks
 * Con un celular desconocido better-auth responde de inmediato; con uno conocido calcula el hash
 * de la contraseña, que cuesta decenas de milisegundos. Esa diferencia bastaría para averiguar
 * qué celulares tienen cuenta aunque el mensaje de error sea idéntico. Aquí se paga el mismo
 * costo cuando el celular no existe. Un cuerpo sin celular o sin contraseña no se toca:
 * better-auth lo rechaza como inválido.
 *
 * @param timing - Consulta de existencia y cálculo del hash.
 * @param body - Cuerpo de la petición, sin validar.
 */
export async function hashWhenPhoneIsUnknown(
  timing: UnknownPhoneTiming,
  body: unknown,
): Promise<void> {
  if (
    !isRecord(body) ||
    typeof body.phoneNumber !== 'string' ||
    typeof body.password !== 'string'
  ) {
    return;
  }
  if (!(await timing.phoneExists(body.phoneNumber))) {
    await timing.hash(body.password);
  }
}

/**
 * La respuesta de better-auth con `mustChangePassword` en falso, como queda en la base de datos.
 *
 * @param response - Respuesta de `/change-password`, con la persona en `user`.
 * @returns Una copia con la marca quitada; la misma respuesta si no trae `user`.
 */
export function withPasswordChangeCleared(
  response: Record<string, unknown>,
): Record<string, unknown> {
  if (!isRecord(response.user)) {
    return response;
  }
  return { ...response, user: { ...response.user, mustChangePassword: false } };
}
