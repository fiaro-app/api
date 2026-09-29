import { Inject, Injectable } from '@nestjs/common';
import type {
  UpdateProfileInput,
  UpdateProfileResult,
} from '@/modules/auth/application/dtos/update-profile.dto.js';
import { RequestContactEmailVerificationUseCase } from '@/modules/auth/application/use-cases/request-contact-email-verification.use-case.js';
import { validateUserData } from '@/modules/auth/application/services/user-data.validator.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';

/**
 * Actualiza el nombre o el correo de contacto de la persona autenticada.
 *
 * @remarks
 * Un campo ausente en el pedido no se toca: el nombre y el resto de los datos siempre se
 * revalidan juntos con {@link validateUserData}, la misma regla que el alta, para que el perfil
 * nunca quede en un estado que esa regla ya no aceptaría. Cambiar o quitar el correo de contacto
 * quita la marca de verificado y pide un código nuevo; dejarlo igual no la toca.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly requestContactEmailVerification: RequestContactEmailVerificationUseCase,
  ) {}

  /**
   * @param input - La persona autenticada y los campos que cambian.
   * @returns El perfil después de actualizarlo.
   * @throws {@link InvalidUserDataError} Si el nombre o el correo no cumplen el contrato.
   */
  async execute(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new Error(`La persona ${input.userId} no existe.`);
    }

    const data = validateUserData({
      fullName: input.fullName ?? user.fullName,
      contactEmail:
        input.contactEmail === undefined
          ? user.contactEmail
          : input.contactEmail,
      nationalId: user.nationalId,
    });

    const contactEmailChanged = data.contactEmail !== user.contactEmail;
    const contactEmailVerified = contactEmailChanged
      ? false
      : user.contactEmailVerified;

    await this.users.updateProfile(user.id, {
      fullName: data.fullName,
      contactEmail: data.contactEmail,
      contactEmailVerified,
    });

    if (contactEmailChanged && data.contactEmail !== null) {
      await this.requestContactEmailVerification.execute({ userId: user.id });
    }

    return {
      fullName: data.fullName,
      contactEmail: data.contactEmail,
      contactEmailVerified,
    };
  }
}
