import { InvalidPasswordError } from '@/modules/auth/domain/errors/invalid-password.error.js';

/** Caracteres mínimos de una contraseña (el prototipo pide 8). */
export const PASSWORD_MIN_LENGTH = 8;
/** Caracteres máximos de una contraseña; el mismo límite de better-auth. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Longitud permitida de una contraseña. Es la misma que aplica el motor de autenticación al
 * cambiarla, para que una contraseña creada aquí nunca sea rechazada allá.
 *
 * @param password - Contraseña en claro.
 * @throws {@link InvalidPasswordError} Si tiene menos de {@link PASSWORD_MIN_LENGTH} o más de {@link PASSWORD_MAX_LENGTH} caracteres.
 */
export function assertPasswordAllowed(password: string): void {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new InvalidPasswordError(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH);
  }
}
