import { Inject, Injectable } from '@nestjs/common';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import type { RequestPasswordResetInput } from '@/modules/auth/application/dtos/request-password-reset.dto.js';
import type { VerificationCodeGenerator } from '@/modules/auth/application/ports/verification-code-generator.port.js';
import { VERIFICATION_CODE_GENERATOR } from '@/modules/auth/application/ports/verification-code-generator.token.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { VERIFICATION_CODE_HASHER } from '@/modules/auth/application/ports/verification-code-hasher.token.js';
import { passwordResetEmail } from '@/modules/auth/domain/notifications/password-reset-email.js';
import { passwordResetVerificationIdentifier } from '@/modules/auth/domain/policies/password-reset.policy.js';
import { VERIFICATION_CODE_TTL_SECONDS } from '@/modules/auth/domain/policies/verification-code.policy.js';
import type { VerificationCodeRepository } from '@/modules/auth/domain/repositories/verification-code.repository.js';
import { VERIFICATION_CODE_REPOSITORY } from '@/modules/auth/domain/tokens/verification-code-repository.token.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Pide recuperar la contraseña de un celular por correo.
 *
 * @remarks
 * No dice si el celular tiene cuenta ni si tiene correo de contacto: si no hay nada que hacer,
 * `execute` no falla, simplemente no manda nada. Así, quien llama (el controlador) siempre
 * responde lo mismo, exista o no la cuenta.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VERIFICATION_CODE_REPOSITORY)
    private readonly verificationCodes: VerificationCodeRepository,
    @Inject(VERIFICATION_CODE_GENERATOR)
    private readonly codeGenerator: VerificationCodeGenerator,
    @Inject(VERIFICATION_CODE_HASHER)
    private readonly codeHasher: VerificationCodeHasher,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El celular con el que se pide la recuperación.
   * @returns Si el celular tiene cuenta con correo de contacto y se mandó el código.
   */
  async execute(input: RequestPasswordResetInput): Promise<boolean> {
    const user = await this.users.findByPhone(input.phoneNumber);
    if (user?.contactEmail == null) {
      return false;
    }

    const code = this.codeGenerator.next();
    const expiresAt = new Date(
      this.clock.now().getTime() + VERIFICATION_CODE_TTL_SECONDS * 1_000,
    );
    await this.verificationCodes.replace(
      passwordResetVerificationIdentifier(user.id),
      this.codeHasher.hash(code),
      expiresAt,
    );

    this.emailSender.send({
      to: user.contactEmail,
      ...passwordResetEmail(code),
    });
    return true;
  }
}
