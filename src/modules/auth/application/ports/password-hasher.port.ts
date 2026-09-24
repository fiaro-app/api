/** Convierte una contraseña en el hash que se guarda; el mismo algoritmo con el que se verifica al iniciar sesión. */
export interface PasswordHasher {
  /**
   * @param password - Contraseña en claro.
   * @returns El hash listo para guardar; nunca la contraseña.
   */
  hash(password: string): Promise<string>;
}
