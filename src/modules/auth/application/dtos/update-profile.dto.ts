/**
 * Datos con los que se actualiza el perfil. Un campo ausente (`undefined`) no se toca; `null` en
 * `contactEmail` lo quita.
 */
export interface UpdateProfileInput {
  /** La persona autenticada. */
  readonly userId: string;
  /** Nombre completo nuevo, si cambia. */
  readonly fullName?: string;
  /** Correo real nuevo, `null` para quitarlo, o ausente si no cambia. */
  readonly contactEmail?: string | null;
}

/** El perfil después de actualizarlo. */
export interface UpdateProfileResult {
  /** Nombre completo. */
  readonly fullName: string;
  /** Correo real de la persona, o `null` si no tiene. */
  readonly contactEmail: string | null;
  /** Si `contactEmail` sigue verificado: `false` si cambió o se quitó. */
  readonly contactEmailVerified: boolean;
}
