import { Inject, Injectable } from '@nestjs/common';
import type { VerifyContactEmailInput } from '@/modules/auth/application/dtos/verify-contact-email.dto.js';
import type { VerificationCodeHasher } from '@/modules/auth/application/ports/verification-code-hasher.port.js';
import { VERIFICATION_CODE_HASHER } from '@/modules/auth/application/ports/verification-code-hasher.token.js';
import { ContactEmailAlreadyVerifiedError } from '@/modules/auth/domain/errors/contact-email-already-verified.error.js';
import { ContactEmailVerificationCodeExpiredError } from '@/modules/auth/domain/errors/contact-email-verification-code-expired.error.js';
import { ContactEmailVerificationCodeInvalidError } from '@/modules/auth/domain/errors/contact-email-verification-code-invalid.error.js';
import { contactEmailVerificationIdentifier } from '@/modules/auth/domain/policies/contact-email-verification.policy.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { VerificationCodeRepository } from '@/modules/auth/domain/repositories/verification-code.repository.js';
import { VERIFICATION_CODE_REPOSITORY } from '@/modules/auth/domain/tokens/verification-code-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** Canjea el código y marca el correo de contacto de la persona autenticada como verificado. */
@Injectable()
export class VerifyContactEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VERIFICATION_CODE_REPOSITORY)
    private readonly verificationCodes: VerificationCodeRepository,
    @Inject(VERIFICATION_CODE_HASHER)
    private readonly codeHasher: VerificationCodeHasher,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - La persona autenticada y el código recibido.
   * @throws {@link ContactEmailAlreadyVerifiedError} Si ya está verificado.
   * @throws {@link ContactEmailVerificationCodeInvalidError} Si no hay un código pendiente o no coincide.
   * @throws {@link ContactEmailVerificationCodeExpiredError} Si el código venció.
   */
  async execute(input: VerifyContactEmailInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new Error(`La persona ${input.userId} no existe.`);
    }
    if (user.contactEmailVerified) {
      throw new ContactEmailAlreadyVerifiedError();
    }

    const identifier = contactEmailVerificationIdentifier(user.id);
    const pending = await this.verificationCodes.find(identifier);
    if (pending === null) {
      throw new ContactEmailVerificationCodeInvalidError();
    }
    if (pending.expiresAt.getTime() <= this.clock.now().getTime()) {
      await this.verificationCodes.delete(identifier);
      throw new ContactEmailVerificationCodeExpiredError();
    }
    if (this.codeHasher.hash(input.code) !== pending.hashedValue) {
      throw new ContactEmailVerificationCodeInvalidError();
    }

    await this.users.markContactEmailVerified(user.id);
    await this.verificationCodes.delete(identifier);
  }
}
