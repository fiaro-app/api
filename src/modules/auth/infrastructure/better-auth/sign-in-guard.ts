import { ErrorCodeSchema } from '@fiaro-app/contracts';
import { APIError } from 'better-auth/api';
import type { SignInAttempts } from '@/modules/auth/application/ports/sign-in-attempts.port.js';
import type {
  AuthAuditor,
  RequestOrigin,
} from '@/modules/auth/infrastructure/better-auth/auth-auditor.js';
import type { PersonalDataMasker } from '@/shared/infrastructure/audit/personal-data-masker.js';

/**
 * Bloquea a quien adivina la contraseña de un celular: después de {@link SIGN_IN_MAX_ATTEMPTS}
 * intentos en la ventana, los siguientes se rechazan con `SIGN_IN_LOCKED` (429) sin comprobar la
 * contraseña, aunque sea la correcta y aunque vengan de otra IP. Lo usan los hooks de better-auth.
 *
 * @remarks
 * La cuenta es por el celular que se envía, exista o no: un celular sin cuenta se bloquea igual que
 * uno con cuenta, así el bloqueo no revela cuáles la tienen. La llave es la huella con clave del
 * celular (la misma de la auditoría), no el celular. Bloquea inicios de sesión nuevos; las
 * sesiones ya abiertas siguen funcionando. El rate limit por IP corre antes y es independiente.
 */
export class SignInGuard {
  /**
   * @param attempts - Dónde se cuentan los intentos.
   * @param masker - Da la huella del celular.
   * @param auditor - A quien se le avisa de un bloqueo.
   */
  constructor(
    private readonly attempts: SignInAttempts,
    private readonly masker: PersonalDataMasker,
    private readonly auditor: AuthAuditor,
  ) {}

  /**
   * Anota un intento de iniciar sesión y lo rechaza si el celular agotó los suyos. Va antes de
   * comprobar la contraseña.
   *
   * @param phone - El celular del cuerpo de la petición, si lo trae.
   * @param origin - Desde dónde se intenta, para la auditoría.
   * @throws {@link APIError} `SIGN_IN_LOCKED` (429) con `X-Retry-After` si no quedan intentos.
   */
  async admit(phone: string | undefined, origin: RequestOrigin): Promise<void> {
    if (phone === undefined) {
      return;
    }
    const verdict = await this.attempts.register(this.masker.mask(phone).hash);
    if (verdict.allowed) {
      return;
    }
    this.auditor.signInLocked(phone, verdict.retryAfterSeconds, origin);
    throw new APIError(
      'TOO_MANY_REQUESTS',
      {
        code: ErrorCodeSchema.enum.SIGN_IN_LOCKED,
        message: 'Demasiados intentos fallidos con este celular.',
      },
      { 'X-Retry-After': String(verdict.retryAfterSeconds) },
    );
  }

  /**
   * Reinicia los intentos del celular: el inicio de sesión salió bien.
   *
   * @param phone - El celular del cuerpo de la petición, si lo trae.
   */
  async forgive(phone: string | undefined): Promise<void> {
    if (phone !== undefined) {
      await this.attempts.clear(this.masker.mask(phone).hash);
    }
  }
}
