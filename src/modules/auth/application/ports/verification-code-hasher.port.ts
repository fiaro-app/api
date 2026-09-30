/** Convierte un código de un solo uso en el hash que se guarda; el código en claro nunca se persiste. */
export interface VerificationCodeHasher {
  /**
   * @param code - Código en claro.
   * @returns El hash listo para guardar o comparar.
   */
  hash(code: string): string;
}
