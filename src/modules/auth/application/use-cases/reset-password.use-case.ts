import { Inject, Injectable } from '@nestjs/common';
import type {
  ResetPasswordInput,
  ResetPasswordResult,
} from '@/modules/auth/application/dtos/reset-password.dto.js';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { VERIFICATION_CODE_HASHER } from '@/modules/auth/application/ports/verification-code-hasher.token.js';
import { PasswordResetCodeExpiredError } from '@/modules/auth/domain/errors/password-reset-code-expired.error.js';
import { PasswordResetCodeInvalidError } from '@/modules/auth/domain/errors/password-reset-code-invalid.error.js';
import { assertPasswordAllowed } from '@/modules/auth/domain/policies/password.policy.js';
import { assertPasswordStrong } from '@/modules/auth/domain/policies/password-strength.policy.js';
import { passwordResetVerificationIdentifier } from '@/modules/auth/domain/policies/password-reset.policy.js';
import type { SessionRepository } from '@/modules/auth/domain/repositories/session.repository.js';
import { SESSION_REPOSITORY } from '@/modules/auth/domain/tokens/session-repository.token.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { VerificationCodeRepository } from '@/modules/auth/domain/repositories/verification-code.repository.js';
import { VERIFICATION_CODE_REPOSITORY } from '@/modules/auth/domain/tokens/verification-code-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Canjea el código de recuperación por una contraseña nueva.
 *
 * @remarks
 * Un celular sin cuenta y un código incorrecto rechazan lo mismo
 * ({@link PasswordResetCodeInvalidError}), para no revelar cuáles celulares tienen cuenta. Al
 * salir bien, cierra todas las sesiones de la persona: quien pide recuperar la contraseña no
 * tiene ninguna sesión propia que conservar, y si alguien más tenía una abierta, la pierde.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VERIFICATION_CODE_REPOSITORY)
    private readonly verificationCodes: VerificationCodeRepository,
    @Inject(VERIFICATION_CODE_HASHER)
    private readonly codeHasher: VerificationCodeHasher,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - Celular, código recibido y contraseña nueva en claro.
   * @returns La persona cuya contraseña se restableció.
   * @throws {@link PasswordResetCodeInvalidError} Si el celular no tiene cuenta, no hay un código pendiente o el código no coincide.
   * @throws {@link PasswordResetCodeExpiredError} Si el código venció.
   * @throws {@link InvalidPasswordError} Si la contraseña nueva no tiene la longitud permitida.
   * @throws {@link WeakPasswordError} Si la contraseña nueva es demasiado fácil de adivinar.
   */
  async execute(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    const user = await this.users.findByPhone(input.phoneNumber);
    if (user === null) {
      throw new PasswordResetCodeInvalidError();
    }

    const identifier = passwordResetVerificationIdentifier(user.id);
    const pending = await this.verificationCodes.find(identifier);
    if (pending === null) {
      throw new PasswordResetCodeInvalidError();
    }
    if (pending.expiresAt.getTime() <= this.clock.now().getTime()) {
      await this.verificationCodes.delete(identifier);
      throw new PasswordResetCodeExpiredError();
    }
    if (this.codeHasher.hash(input.code) !== pending.hashedValue) {
      throw new PasswordResetCodeInvalidError();
    }

    assertPasswordAllowed(input.newPassword);
    assertPasswordStrong(input.newPassword, {
      phone: input.phoneNumber,
      nationalId: user.nationalId,
    });

    await this.users.updatePassword(
      user.id,
      await this.passwordHasher.hash(input.newPassword),
    );
    await this.verificationCodes.delete(identifier);
    await this.sessions.revokeAllForUser(user.id);

    return { userId: user.id };
  }
}
