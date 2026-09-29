/**
 * Cuántas veces se puede pedir un código para el mismo celular dentro de la ventana, antes de
 * dejar de mandar correos (la respuesta sigue siendo la misma, para no revelar nada): protege la
 * bandeja de quien recibe el correo de que la spameen pidiendo códigos una y otra vez.
 */
export const PASSWORD_RESET_REQUEST_MAX_ATTEMPTS = 3;

/** Ventana de {@link PASSWORD_RESET_REQUEST_MAX_ATTEMPTS}, en segundos (una hora). */
export const PASSWORD_RESET_REQUEST_WINDOW_SECONDS = 60 * 60;

/**
 * Cuántas veces se puede intentar canjear el código de un celular dentro de la ventana, antes de
 * rechazar el intento sin comprobar el código: protege el código (6 dígitos) de que lo adivinen
 * por fuerza bruta.
 */
export const PASSWORD_RESET_VERIFY_MAX_ATTEMPTS = 5;

/** Ventana de {@link PASSWORD_RESET_VERIFY_MAX_ATTEMPTS}, en segundos (15 minutos). */
export const PASSWORD_RESET_VERIFY_WINDOW_SECONDS = 15 * 60;

/**
 * El identificador con el que se guarda el código de recuperación de una persona en la tabla de
 * verificaciones: nunca hay más de un código de recuperación vigente por persona.
 *
 * @param userId - La persona.
 */
export function passwordResetVerificationIdentifier(userId: string): string {
  return `password-reset:${userId}`;
}
