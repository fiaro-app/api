/** Un código pendiente de canjear, ya con su valor hasheado. */
export interface VerificationCode {
  /** Hash del código; el código en claro nunca se guarda. */
  readonly hashedValue: string;
  /** Cuándo deja de ser válido. */
  readonly expiresAt: Date;
}

/**
 * Puerto de persistencia de los códigos de un solo uso (recuperar contraseña, verificar un
 * correo...), guardados en la tabla `verifications` de better-auth.
 */
export interface VerificationCodeRepository {
  /**
   * Reemplaza cualquier código pendiente para ese identificador por uno nuevo: nunca hay más de
   * uno vigente a la vez para el mismo propósito y persona.
   *
   * @param identifier - A qué pertenece el código, por ejemplo `password-reset:<userId>`.
   * @param hashedValue - Hash del código.
   * @param expiresAt - Cuándo vence.
   */
  replace(
    identifier: string,
    hashedValue: string,
    expiresAt: Date,
  ): Promise<void>;

  /**
   * @param identifier - A qué pertenece el código.
   * @returns El código pendiente, o `null` si no hay uno.
   */
  find(identifier: string): Promise<VerificationCode | null>;

  /**
   * Olvida el código: ya se canjeó o hay que pedir uno nuevo.
   *
   * @param identifier - A qué pertenece el código.
   */
  delete(identifier: string): Promise<void>;
}
