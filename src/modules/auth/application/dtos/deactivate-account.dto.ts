/** Datos con los que se desactiva la cuenta. */
export interface DeactivateAccountInput {
  /** La persona autenticada. */
  readonly userId: string;
  /** Contraseña actual, como confirmación. */
  readonly password: string;
}
