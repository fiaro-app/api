import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { ContactEmailVerificationCodeInvalidError } from '@/modules/auth/domain/errors/contact-email-verification-code-invalid.error.js';

/**
 * Limita cuántas veces se puede intentar canjear el código de verificación del correo de
 * contacto, por persona.
 *
 * @remarks
 * Es una ruta autenticada: la llave es el `userId` directo, sin enmascarar (a diferencia del
 * celular en {@link PasswordResetGuard}, el id de una persona ya autenticada no es un dato que
 * haya que esconder de Redis).
 */
export class ContactEmailVerificationGuard {
  /** @param verifyAttempts - Cuenta los intentos de canjear el código. */
  constructor(private readonly verifyAttempts: SignInAttempts) {}

  /**
   * Anota un intento de canjear el código.
   *
   * @param userId - La persona.
   * @throws {@link ContactEmailVerificationCodeInvalidError} Si esa persona agotó sus intentos de canje.
   */
  async admitVerification(userId: string): Promise<void> {
    const verdict = await this.verifyAttempts.register(userId);
    if (!verdict.allowed) {
      throw new ContactEmailVerificationCodeInvalidError();
    }
  }

  /**
   * Olvida los intentos de canje de esa persona: el correo se verificó.
   *
   * @param userId - La persona.
   */
  async forgiveVerification(userId: string): Promise<void> {
    await this.verifyAttempts.clear(userId);
  }
}
