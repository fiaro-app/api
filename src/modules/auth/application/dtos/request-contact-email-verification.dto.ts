/** Datos con los que se pide verificar el correo de contacto. */
export interface RequestContactEmailVerificationInput {
  /** La persona autenticada. */
  readonly userId: string;
}
