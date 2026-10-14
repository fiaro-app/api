import { InvalidPasswordError } from '@/modules/auth/domain/errors/invalid-password.error.js';

/**
 * Caracteres mínimos de una contraseña: 15, lo que exige NIST SP 800-63B-4 (§3.1.1.2) cuando la
 * contraseña es el único factor de inicio de sesión, como aquí. A propósito no se piden
 * mayúsculas, números ni símbolos: el mismo estándar lo prohíbe, porque empuja a patrones
 * previsibles (`Clave2026!`); la protección es el largo más la lista de contraseñas débiles
 * (`assertPasswordStrong`). Solo se aplica al crear o cambiar una contraseña, no al iniciar
 * sesión (D-121).
 */
export const PASSWORD_MIN_LENGTH = 15;
/** Caracteres máximos de una contraseña; el mismo límite de better-auth (NIST pide al menos 64). */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Si la contraseña tiene la longitud permitida.
 *
 * @param password - Contraseña en claro.
 */
export function isPasswordLengthAllowed(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}

/**
 * Longitud permitida de una contraseña. Es la misma que aplica el motor de autenticación al
 * cambiarla, para que una contraseña creada aquí nunca sea rechazada allá.
 *
 * @param password - Contraseña en claro.
 * @throws {@link InvalidPasswordError} Si tiene menos de {@link PASSWORD_MIN_LENGTH} o más de {@link PASSWORD_MAX_LENGTH} caracteres.
 */
export function assertPasswordAllowed(password: string): void {
  if (!isPasswordLengthAllowed(password)) {
    throw new InvalidPasswordError(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH);
  }
}
