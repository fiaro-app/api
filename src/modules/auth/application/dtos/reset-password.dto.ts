/** Datos con los que se canjea el código y se fija la contraseña nueva. */
export interface ResetPasswordInput {
  /** Celular en formato E.164, ya validado. */
  readonly phoneNumber: string;
  /** Código de un solo uso recibido por correo. */
  readonly code: string;
  /** Contraseña nueva, en claro. */
  readonly newPassword: string;
}

/** Lo que devuelve un canje exitoso. */
export interface ResetPasswordResult {
  /** La persona cuya contraseña se restableció. */
  readonly userId: string;
}
