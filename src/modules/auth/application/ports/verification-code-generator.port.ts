/** Genera códigos de un solo uso (recuperar contraseña, verificar un correo...). */
export interface VerificationCodeGenerator {
  /** @returns Un código nuevo, al azar. */
  next(): string;
}
