/** Datos con los que se canjea el código y se verifica el correo de contacto. */
export interface VerifyContactEmailInput {
  /** La persona autenticada. */
  readonly userId: string;
  /** Código de un solo uso recibido por correo. */
  readonly code: string;
}
