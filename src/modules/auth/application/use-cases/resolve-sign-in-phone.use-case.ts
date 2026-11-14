import { Inject, Injectable } from '@nestjs/common';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import {
  isEmailIdentifier,
  pseudoPhoneForEmail,
} from '@/modules/auth/domain/policies/sign-in-identifier.policy.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';

/**
 * Convierte lo que la persona escribió para entrar (celular o correo) en el celular con el que
 * se inicia sesión.
 *
 * @remarks
 * Solo un correo verificado resuelve a una cuenta. Cualquier otro (desconocido o sin verificar)
 * resuelve a un celular falso estable, para que no se pueda distinguir de una contraseña
 * incorrecta (ver `pseudoPhoneForEmail`).
 */
@Injectable()
export class ResolveSignInPhoneUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /**
   * @param identifier - Celular E.164 o correo, ya validados.
   * @returns El celular con el que se inicia sesión.
   */
  async execute(identifier: string): Promise<string> {
    if (!isEmailIdentifier(identifier)) {
      return identifier;
    }
    const email = identifier.toLowerCase();
    const user = await this.users.findByVerifiedContactEmail(email);
    return user === null ? pseudoPhoneForEmail(email) : user.phone.value;
  }
}
