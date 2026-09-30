/** Datos con los que se da de alta a una persona. */
export interface CreateUserInput {
  /** Celular en formato E.164 (`+573001234567`). */
  readonly phone: string;
  /** Nombre completo; el contrato compartido (`UserSchema`) define sus límites. */
  readonly fullName: string;
  /** Contraseña en claro. Cumple la política de contraseñas y solo se guarda su hash. */
  readonly password: string;
  /** Cédula de ciudadanía, opcional. El formato lo define el contrato compartido. */
  readonly nationalId?: string | null;
  /** Correo real de la persona, opcional: el inicio de sesión es por celular. */
  readonly contactEmail?: string | null;
  /** `true` cuando la contraseña es temporal y la persona debe cambiarla al entrar. */
  readonly mustChangePassword?: boolean;
}

/** La persona creada: lo que el alta devuelve a quien la pidió. Nunca incluye la contraseña. */
export interface CreatedUser {
  /** Identificador de la persona (UUIDv7). */
  readonly id: string;
  /** Celular en formato E.164. */
  readonly phone: string;
  /** Nombre completo, sin espacios sobrantes. */
  readonly fullName: string;
  /** Correo real de la persona, o `null` si no lo dio. */
  readonly contactEmail: string | null;
  /** Siempre `false`: una cuenta recién creada no tiene el correo de contacto verificado. */
  readonly contactEmailVerified: boolean;
  /** Cédula de ciudadanía, o `null` si no la dio. */
  readonly nationalId: string | null;
  /** `true` cuando la contraseña es temporal y debe cambiarse al entrar. */
  readonly mustChangePassword: boolean;
  /** Cuándo se dio de alta. */
  readonly createdAt: Date;
}
