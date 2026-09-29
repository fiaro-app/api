import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import { PasswordResetCodeInvalidError } from '@/modules/auth/domain/errors/password-reset-code-invalid.error.js';
import type { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';

/**
 * Limita, por celular, cuántas veces se puede pedir un código de recuperación y cuántas se puede
 * intentar canjear.
 *
 * @remarks
 * La llave de cada contador es la huella con clave del celular (la misma de la auditoría), nunca
 * el celular: el celular no llega a Redis. La cuenta es por el celular que se envía, exista o no
 * cuenta con él, así el bloqueo no revela cuáles celulares tienen cuenta.
 */
export class PasswordResetGuard {
  /**
   * @param requestAttempts - Cuenta los pedidos de código.
   * @param verifyAttempts - Cuenta los intentos de canjearlo.
   * @param masker - Da la huella del celular.
   */
  constructor(
    private readonly requestAttempts: SignInAttempts,
    private readonly verifyAttempts: SignInAttempts,
    private readonly masker: PersonalDataMasker,
  ) {}

  /**
   * Anota un pedido de código. Nunca lanza: el endpoint siempre responde lo mismo, se haya
   * mandado el correo o no.
   *
   * @param phone - El celular con el que se pide.
   * @returns Si todavía caben más pedidos para ese celular en la ventana.
   */
  async admitRequest(phone: string): Promise<boolean> {
    const verdict = await this.requestAttempts.register(
      this.masker.mask(phone).hash,
    );
    return verdict.allowed;
  }

  /**
   * Anota un intento de canjear el código.
   *
   * @param phone - El celular con el que se intenta.
   * @throws {@link PasswordResetCodeInvalidError} Si ese celular agotó sus intentos de canje.
   */
  async admitVerification(phone: string): Promise<void> {
    const verdict = await this.verifyAttempts.register(
      this.masker.mask(phone).hash,
    );
    if (!verdict.allowed) {
      throw new PasswordResetCodeInvalidError();
    }
  }

  /**
   * Olvida los intentos de canje de ese celular: la contraseña se restableció.
   *
   * @param phone - El celular.
   */
  async forgiveVerification(phone: string): Promise<void> {
    await this.verifyAttempts.clear(this.masker.mask(phone).hash);
  }
}
