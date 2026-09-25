/** Qué se decide de un intento de iniciar sesión. */
export interface SignInAttemptVerdict {
  /** Si el intento puede seguir a que se compruebe la contraseña. */
  readonly allowed: boolean;
  /** Si no puede, cuántos segundos faltan para que el celular vuelva a tener intentos; si puede, 0. */
  readonly retryAfterSeconds: number;
}

/**
 * Cuenta los intentos de iniciar sesión con cada celular, para bloquear al que adivina
 * contraseñas.
 *
 * @remarks
 * El intento se anota **antes** de comprobar la contraseña y se olvida si sale bien: así, aunque
 * lleguen muchos intentos a la vez, solo pasan los que caben en el límite (si se anotara después
 * de fallar, todos los simultáneos pasarían la comprobación antes de que el primero se contara).
 * La identidad es una huella con clave del celular, nunca el celular: el celular no llega a Redis.
 */
export interface SignInAttempts {
  /**
   * Anota un intento con ese celular y dice si puede seguir.
   *
   * @param subject - Huella del celular con el que se intenta.
   */
  register(subject: string): Promise<SignInAttemptVerdict>;

  /**
   * Olvida los intentos de ese celular: el inicio de sesión salió bien.
   *
   * @param subject - Huella del celular.
   */
  clear(subject: string): Promise<void>;
}
