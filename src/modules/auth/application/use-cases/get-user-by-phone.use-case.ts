import { Inject, Injectable } from '@nestjs/common';
import type { CreatedUser } from '@/modules/auth/application/dtos/create-user.dto.js';
import { toCreatedUser } from '@/modules/auth/application/dtos/created-user.mapper.js';
import type { UserRepository } from '@/modules/auth/domain/repositories/user.repository.js';
import { USER_REPOSITORY } from '@/modules/auth/domain/tokens/user-repository.token.js';
import { MobilePhone } from '@/shared/domain/value-objects/mobile-phone.value-object.js';

/**
 * Busca a la persona con ese celular, si ya tiene cuenta. Lo usa `memberships` para saber si
 * invitar a alguien crea una persona nueva o solo le agrega una membresía a la que ya existe
 * (PRODUCT.md §5): `memberships/application` no puede importar `auth/domain` (regla de fronteras,
 * ARCHITECTURE.md §3), así que necesita este caso de uso en vez de `UserRepository` directo.
 */
@Injectable()
export class GetUserByPhoneUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /**
   * @param phone - Celular en formato E.164.
   * @returns La persona con ese celular, o `null` si no tiene cuenta.
   * @throws {@link InvalidMobilePhoneError} Si el celular no está en formato E.164.
   */
  async execute(phone: string): Promise<CreatedUser | null> {
    const parsed = MobilePhone.parse(phone);
    const user = await this.users.findByPhone(parsed.value);
    return user === null ? null : toCreatedUser(user);
  }
}
