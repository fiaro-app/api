/**
 * Cuántas veces se puede intentar canjear el código dentro de la ventana, antes de rechazar el
 * intento sin comprobarlo: protege el código (6 dígitos) de que lo adivinen por fuerza bruta. Los
 * pedidos del código no tienen un límite propio: es una ruta autenticada (no hay riesgo de
 * enumeración) y el rate limit general de la API por IP ya la cubre.
 */
export const CONTACT_EMAIL_VERIFICATION_VERIFY_MAX_ATTEMPTS = 5;

/** Ventana de {@link CONTACT_EMAIL_VERIFICATION_VERIFY_MAX_ATTEMPTS}, en segundos (15 minutos). */
export const CONTACT_EMAIL_VERIFICATION_VERIFY_WINDOW_SECONDS = 15 * 60;

/**
 * El identificador con el que se guarda el código de verificación del correo de una persona en
 * la tabla de verificaciones: nunca hay más de un código de verificación vigente por persona.
 *
 * @param userId - La persona.
 */
export function contactEmailVerificationIdentifier(userId: string): string {
  return `contact-email-verification:${userId}`;
}
