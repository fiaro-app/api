import { Inject, Injectable } from '@nestjs/common';
import type {
  CreatedUser,
  CreateUserInput,
} from '@/modules/auth/application/dtos/create-user.dto.js';
import { toCreatedUser } from '@/modules/auth/application/dtos/created-user.mapper.js';
import type { PasswordHasher } from '@/modules/auth/application/ports/password-hasher.port.js';
import { PASSWORD_HASHER } from '@/modules/auth/application/ports/password-hasher.token.js';
import { validateUserData } from '@/modules/auth/application/services/user-data.validator.js';
import { User } from '@/modules/auth/domain/entities/user.entity.js';
import { assertPasswordAllowed } from '@/modules/auth/domain/policies/password.policy.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

/**
 * Crea una persona con su contraseña. Es el único camino para dar de alta un usuario: lo usarán
 * el registro del dueño y el alta de cobradores.
 *
 * @remarks
 * Valida todo antes de tocar la base de datos y guarda solo el hash de la contraseña.
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - Celular en formato E.164, datos de la persona y contraseña en claro.
   * @returns La persona creada, sin la contraseña.
   * @throws {@link InvalidMobilePhoneError} Si el celular no está en formato E.164.
   * @throws {@link InvalidUserDataError} Si el nombre, la cédula o el email no cumplen el contrato.
   * @throws {@link InvalidPasswordError} Si la contraseña no tiene la longitud permitida.
   * @throws {@link PhoneAlreadyRegisteredError} Si el celular ya tiene cuenta.
   */
  async execute(input: CreateUserInput): Promise<CreatedUser> {
    const phone = MobilePhone.parse(input.phone);
    const data = validateUserData(input);
    assertPasswordAllowed(input.password);

    const user = User.create({
      id: this.ids.next(),
      phone,
      ...data,
      mustChangePassword: input.mustChangePassword ?? false,
      createdAt: this.clock.now(),
    });
    await this.users.create(
      user,
      await this.passwordHasher.hash(input.password),
    );
    return toCreatedUser(user);
  }
}
