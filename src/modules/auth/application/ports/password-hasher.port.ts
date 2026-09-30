/** Convierte una contraseña en el hash que se guarda; el mismo algoritmo con el que se verifica al iniciar sesión. */
export interface PasswordHasher {
  /**
   * @param password - Contraseña en claro.
   * @returns El hash listo para guardar; nunca la contraseña.
   */
  hash(password: string): Promise<string>;

  /**
   * Comprueba una contraseña contra su hash, con el mismo algoritmo con el que inicia sesión.
   *
   * @param password - Contraseña en claro.
   * @param hash - Hash guardado.
   * @returns Si la contraseña corresponde al hash.
   */
  verify(password: string, hash: string): Promise<boolean>;
}
