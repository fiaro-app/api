/** Persona autenticada en la petición. Sus roles no van aquí: viven en la membresía (D-02). */
export interface AuthenticatedUser {
  /** Identificador de la persona (UUIDv7). */
  readonly id: string;
  /** Celular en formato E.164. */
  readonly phone: string;
  /** Nombre completo. */
  readonly fullName: string;
  /** La contraseña actual es temporal: solo puede cambiarla y cerrar sesión (§8 de PRODUCT.md). */
  readonly mustChangePassword: boolean;
}

/** Sesión vigente de una petición. */
export interface AuthenticatedSession {
  /** Identificador de la sesión. */
  readonly id: string;
  /** La persona dueña de la sesión. */
  readonly user: AuthenticatedUser;
}

/** Cabeceras de una petición HTTP, tal como las entrega Node. */
export type RequestHeaders = Readonly<
  Record<string, string | string[] | undefined>
>;

/**
 * Identifica quién hace una petición a partir de sus cabeceras (la cookie de sesión).
 *
 * @remarks
 * Es de solo lectura: no renueva la sesión ni escribe cookies. La renovación la hace la ruta de
 * autenticación, que sí responde con `Set-Cookie`.
 */
export interface SessionResolver {
  /** La sesión vigente, o `null` si no hay ninguna, venció o fue revocada. */
  resolve(headers: RequestHeaders): Promise<AuthenticatedSession | null>;
}
