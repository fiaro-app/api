/** Datos con los que se pide recuperar la contraseña. */
export interface RequestPasswordResetInput {
  /** Celular en formato E.164, ya validado. */
  readonly phoneNumber: string;
}
