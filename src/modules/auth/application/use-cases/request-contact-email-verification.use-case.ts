import { Inject, Injectable } from '@nestjs/common';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';
import type { RequestContactEmailVerificationInput } from '@/modules/auth/application/dtos/request-contact-email-verification.dto.js';
import type { VerificationCodeGenerator } from '@/modules/auth/application/ports/verification-code-generator.port.js';
import { VERIFICATION_CODE_GENERATOR } from '@/modules/auth/application/ports/verification-code-generator.token.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { VERIFICATION_CODE_HASHER } from '@/modules/auth/application/ports/verification-code-hasher.token.js';
import { contactEmailVerificationEmail } from '@/modules/auth/domain/notifications/contact-email-verification-email.js';
import { ContactEmailAlreadyVerifiedError } from '@/modules/auth/domain/errors/contact-email-already-verified.error.js';
import { ContactEmailNotSetError } from '@/modules/auth/domain/errors/contact-email-not-set.error.js';
import { contactEmailVerificationIdentifier } from '@/modules/auth/domain/policies/contact-email-verification.policy.js';
import { VERIFICATION_CODE_TTL_SECONDS } from '@/modules/auth/domain/policies/verification-code.policy.js';
import type { VerificationCodeRepository } from '@/modules/auth/domain/repositories/verification-code.repository.js';
import { VERIFICATION_CODE_REPOSITORY } from '@/modules/auth/domain/tokens/verification-code-repository.token.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Pide verificar el correo de contacto de la persona autenticada: manda un código de 6 dígitos.
 */
@Injectable()
export class RequestContactEmailVerificationUseCase {
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
   * @param input - La persona autenticada.
   * @throws {@link ContactEmailNotSetError} Si no tiene un correo de contacto registrado.
   * @throws {@link ContactEmailAlreadyVerifiedError} Si ya está verificado.
   */
  async execute(input: RequestContactEmailVerificationInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new Error(`La persona ${input.userId} no existe.`);
    }
    if (user.contactEmail === null) {
      throw new ContactEmailNotSetError();
    }
    if (user.contactEmailVerified) {
      throw new ContactEmailAlreadyVerifiedError();
    }

    const code = this.codeGenerator.next();
    const expiresAt = new Date(
      this.clock.now().getTime() + VERIFICATION_CODE_TTL_SECONDS * 1_000,
    );
    await this.verificationCodes.replace(
      contactEmailVerificationIdentifier(user.id),
      this.codeHasher.hash(code),
      expiresAt,
    );

    this.emailSender.send({
      to: user.contactEmail,
      ...contactEmailVerificationEmail(code),
    });
  }
}
